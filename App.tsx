import React, { useState, createContext, useCallback, useEffect } from 'react';
import RepoInput from './components/RepoInput';
import FileTree from './components/FileTree';
import CodeViewer from './components/CodeViewer';
import ChatInterface from './components/ChatInterface';
import ApiKeyChecker from './components/ApiKeyChecker';
import Modal from './components/Modal'; // New import
import Tabs from './components/Tabs'; // New import
import { RepoFile, ChatMessage, AppContextType, ActiveTab } from './types';
import { fetchDefaultBranch, fetchRepoTree, fetchFileContent as fetchGitHubFileContent } from './services/githubService';
import { analyzeCodeWithGemini } from './services/geminiService';

export const AppContext = createContext<AppContextType | undefined>(undefined);

const App: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState<string>('https://github.com/google/gemini-api-cookbook');
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('codeViewer'); // New state for active tab
  const [showRepoInputModal, setShowRepoInputModal] = useState<boolean>(false); // New state for repo input modal

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
      activeTab,
      setActiveTab,
      showRepoInputModal,
      setShowRepoInputModal,
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
    setActiveTab('codeViewer'); // Reset active tab
  }, []);

  const fetchRepo = useCallback(async (url: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setChatMessages([]); // Clear chat on new repo fetch
    setSelectedFilePath(null); // Clear selected file
    setCurrentFileContent(null); // Clear file content
    setActiveTab('codeViewer'); // Default to code viewer after fetching repo

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
      setShowRepoInputModal(false); // Close modal on successful fetch
    } catch (err: any) {
      console.error('Failed to fetch repository:', err);
      setErrorMessage(err.message || 'Failed to fetch repository. Please check the URL and try again.');
      setRepoFiles([]); // Clear files on error
      setShowRepoInputModal(true); // Keep modal open if there was an error
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
      setSelectedFilePath(filePath); // Set selected path only on successful content fetch
      setActiveTab('codeViewer'); // Automatically switch to Code Viewer tab
      setErrorMessage(null);
    } catch (err: any) {
      console.error(`Failed to fetch content for ${filePath}:`, err);
      setErrorMessage(err.message || `Failed to fetch content for ${filePath}.`);
      setCurrentFileContent(null);
      setSelectedFilePath(null); // Clear selected path on error
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

  // Auto-show RepoInput modal if no repo is loaded
  useEffect(() => {
    if (!repoFiles.length && !isLoading && !errorMessage) {
      setShowRepoInputModal(true);
    }
  }, [repoFiles.length, isLoading, errorMessage]);

  // Provide the context value to the entire application.
  const contextValue = useContextValue();

  const mainTabs = [
    { id: 'codeViewer' as ActiveTab, title: 'Code Viewer', content: <CodeViewer /> },
    { id: 'aiAssistant' as ActiveTab, title: 'AI Assistant', content: <ChatInterface /> },
  ];

  return (
    <AppContext.Provider value={contextValue}>
      {!isApiKeySelected ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <ApiKeyChecker />
        </div>
      ) : (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-900 animate-fade-in">
          <header className="bg-gradient-to-r from-gray-900 to-gray-800 text-gray-100 py-4 px-8 shadow-lg z-20 flex items-center justify-between">
            <h1 className="text-4xl font-bold tracking-wider">GitHub Code Analyzer</h1>
            {repoFiles.length > 0 && (
              <button
                onClick={() => setShowRepoInputModal(true)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md transition-all duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label="Change Repository"
              >
                Change Repository
              </button>
            )}
          </header>

          <div className="flex-1 flex overflow-hidden">
            {/* File Tree Sidebar */}
            <div className="w-80 flex-shrink-0 bg-gray-800 border-r border-gray-700 overflow-hidden">
              <h2 className="text-xl font-semibold text-gray-100 p-4 sticky top-0 bg-gray-800 z-10 border-b border-gray-700">Files ({repoName || 'Repository'})</h2>
              <FileTree />
            </div>

            {/* Main Content Area with Tabs */}
            <div className="flex-1 min-w-0">
              <Tabs tabs={mainTabs} activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </div>

          <Modal
            isOpen={showRepoInputModal}
            onClose={() => setShowRepoInputModal(false)}
            title="Load GitHub Repository"
            className="md:max-w-3xl"
          >
            <RepoInput
              onClose={() => setShowRepoInputModal(false)}
              onRepoFetched={() => setShowRepoInputModal(false)}
            />
          </Modal>
        </div>
      )}
    </AppContext.Provider>
  );
};

export default App;