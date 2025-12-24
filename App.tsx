import React, { useState, createContext, useCallback, useEffect } from 'react';
import RepoInput from './components/RepoInput';
import FileTree from './components/FileTree';
import CodeViewer from './components/CodeViewer';
import ChatInterface from './components/ChatInterface';
import ApiKeyChecker from './components/ApiKeyChecker';
import { RepoFile, ChatMessage, AppContextType } from './types';
import { fetchDefaultBranch, fetchRepoTree, fetchFileContent as fetchGitHubFileContent } from './services/githubService';
import { analyzeCodeWithGemini } from './services/geminiService';

export const AppContext = createContext<AppContextType | undefined>(undefined);

const App: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [repoOwner, setRepoOwner] = useState<string>('');
  const [repoName, setRepoName] = useState<string>('');
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [currentFileContent, setCurrentFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(false);

  // Helper to ensure context is always used within a provider
  const useContextValue = (): AppContextType => {
    return {
      repoUrl,
      setRepoUrl,
      repoOwner,
      repoName,
      setRepoDetails: useCallback((owner: string, name: string) => {
        setRepoOwner(owner);
        setRepoName(name);
      }, []),
      repoFiles,
      setRepoFiles,
      selectedFilePath,
      setSelectedFilePath,
      currentFileContent,
      setCurrentFileContent,
      isLoading,
      setIsLoading,
      errorMessage,
      setErrorMessage,
      chatMessages,
      setChatMessages,
      isAiThinking,
      setIsAiThinking,
      isApiKeySelected,
      setIsApiKeySelected,
      fetchRepo,
      fetchFileContent,
      sendMessageToAI,
      clearState,
    };
  };

  const clearState = useCallback(() => {
    setRepoUrl('');
    setRepoOwner('');
    setRepoName('');
    setRepoFiles([]);
    setSelectedFilePath(null);
    setCurrentFileContent(null);
    setIsLoading(false);
    setErrorMessage(null);
    setChatMessages([]);
    setIsAiThinking(false);
  }, []);

  const fetchRepo = useCallback(async (url: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setChatMessages([]); // Clear chat on new repo fetch
    setSelectedFilePath(null); // Clear selected file
    setCurrentFileContent(null); // Clear file content

    try {
      const githubUrlRegex = /^https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)(\/.*)?$/;
      const match = url.match(githubUrlRegex);

      if (!match) {
        throw new Error("Invalid GitHub URL format. Please use 'https://github.com/owner/repo'.");
      }

      const owner = match[1];
      const repo = match[2];

      setRepoOwner(owner);
      setRepoName(repo);

      const defaultBranch = await fetchDefaultBranch(owner, repo);
      const files = await fetchRepoTree(owner, repo, defaultBranch);
      setRepoFiles(files);
      setErrorMessage(null); // Clear error if successful
    } catch (err: any) {
      console.error('Failed to fetch repository:', err);
      setErrorMessage(err.message || 'Failed to fetch repository. Please check the URL and try again.');
      setRepoFiles([]); // Clear files on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFileContent = useCallback(async (filePath: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentFileContent(null); // Clear previous content

    // Find the file object to get its raw content URL
    const findFileRecursive = (files: RepoFile[], path: string): RepoFile | undefined => {
      for (const file of files) {
        if (file.path === path && file.type === 'file') {
          return file;
        }
        if (file.type === 'dir' && file.children) {
          const found = findFileRecursive(file.children, path);
          if (found) return found;
        }
      }
      return undefined;
    };

    const fileToFetch = findFileRecursive(repoFiles, filePath);

    if (!fileToFetch || !fileToFetch.url) {
      setErrorMessage(`File '${filePath}' not found or URL is missing.`);
      setIsLoading(false);
      return;
    }

    try {
      const content = await fetchGitHubFileContent(fileToFetch.url);
      setCurrentFileContent(content);
      setErrorMessage(null);
    } catch (err: any) {
      console.error(`Failed to fetch content for ${filePath}:`, err);
      setErrorMessage(err.message || `Failed to fetch content for ${filePath}.`);
      setCurrentFileContent(null);
    } finally {
      setIsLoading(false);
    }
  }, [repoFiles]); // Depend on repoFiles to ensure latest tree structure

  const sendMessageToAI = useCallback(async (userQuery: string, contextCode: string | null) => {
    setIsAiThinking(true);
    setErrorMessage(null);
    const updatedMessages: ChatMessage[] = [...chatMessages, { role: 'user', text: userQuery }];
    setChatMessages(updatedMessages); // Update with user's message

    try {
      const aiResponseText = await analyzeCodeWithGemini(contextCode, userQuery);
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { role: 'ai', text: aiResponseText },
      ]);
    } catch (err: any) {
      console.error('Error in AI interaction:', err);
      setErrorMessage(err.message || 'Failed to get AI response. Please try again.');
      // If API key is invalid, prompt user to select it again.
      if (err.message.includes("API Key selection failed or is invalid.")) {
        setIsApiKeySelected(false);
        setErrorMessage("Invalid API Key. Please select a valid key from a paid GCP project.");
      }
    } finally {
      setIsAiThinking(false);
    }
  }, [chatMessages, setIsApiKeySelected]); // Dependency on chatMessages to correctly append

  // Provide the context value to the entire application.
  const contextValue = useContextValue();

  return (
    <AppContext.Provider value={contextValue}>
      {!isApiKeySelected ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <ApiKeyChecker />
        </div>
      ) : (
        <div className="flex flex-col h-screen overflow-hidden">
          <header className="bg-gray-800 text-gray-100 p-4 shadow-md z-20">
            <h1 className="text-2xl font-bold">GitHub Code Analyzer</h1>
          </header>

          <RepoInput />

          <div className="flex-1 flex overflow-hidden">
            {/* File Tree Sidebar */}
            <div className="w-1/4 bg-gray-800 border-r border-gray-700 flex-shrink-0 overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-100 p-4 sticky top-0 bg-gray-800 z-10 border-b border-gray-700">Files ({repoName || 'Repository'})</h2>
              <FileTree />
            </div>

            {/* Code Viewer */}
            <CodeViewer />

            {/* Chat Interface */}
            <div className="w-1/3 bg-gray-800 border-l border-gray-700 flex-shrink-0 overflow-hidden">
              <ChatInterface />
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export default App;