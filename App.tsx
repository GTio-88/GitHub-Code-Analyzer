import React, { useState, createContext, useCallback, useEffect } from 'react';
import RepoInput from './components/RepoInput';
import FileTree from './components/FileTree';
import CodeViewer from './components/CodeViewer';
import ChatInterface from './components/ChatInterface';
import ApiKeyChecker from './components/ApiKeyChecker';
import Modal from './components/Modal';
import Tabs from './components/Tabs';
import { RepoFile, ChatMessage, AppContextType, ActiveTab } from './types';
import { fetchDefaultBranch, fetchRepoTree, fetchFileContent as fetchGitHubFileContent } from './services/githubService';
import { analyzeCodeWithGemini } from './services/geminiService';

export const AppContext = createContext<AppContextType | undefined>(undefined);

const App: React.FC = () => {
  // Initialize repoUrl and githubPat from localStorage
  const [repoUrl, setRepoUrl] = useState<string>(() => localStorage.getItem('lastRepoUrl') || '');
  const [githubPat, setGithubPat] = useState<string | null>(() => {
    const storedPat = localStorage.getItem('lastGithubPat');
    return storedPat === '' ? null : storedPat; // Ensure empty string becomes null
  });
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('aiAssistant');
  const [showRepoInputModal, setShowRepoInputModal] = useState<boolean>(false);

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
      githubPat,
      setGithubPat,
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
    setIsApiKeySelected(false);
    setGithubPat(null);
    setActiveTab('aiAssistant');
    // Clear localStorage on state clear
    localStorage.removeItem('lastRepoUrl');
    localStorage.removeItem('lastGithubPat');
  }, []);

  const fetchRepo = useCallback(async (url: string, pat: string | null): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);
    setChatMessages([]);
    setSelectedFilePath(null);
    setCurrentFileContent(null);
    setActiveTab('aiAssistant');
    
    try {
      const githubUrlRegex = /^https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?(\/.*)?$/;
      const match = url.match(githubUrlRegex);

      if (!match) {
        throw new Error("Invalid GitHub URL format. Please use 'https://github.com/owner/repo'.");
      }

      const owner = match[1];
      const repo = match[2];

      setRepoOwner(owner);
      setRepoName(repo);

      const defaultBranch = await fetchDefaultBranch(owner, repo, pat);
      const files = await fetchRepoTree(owner, repo, defaultBranch, pat);
      setRepoFiles(files);
      setErrorMessage(null);
      setShowRepoInputModal(false);

      // Save to localStorage on successful fetch
      localStorage.setItem('lastRepoUrl', url);
      localStorage.setItem('lastGithubPat', pat || '');

      return true;
    } catch (err: any) {
      console.error('Failed to fetch repository:', err);
      setErrorMessage(err.message || 'Failed to fetch repository. Please check the URL and try again.');
      setRepoFiles([]);
      setShowRepoInputModal(true);
      // Clear localStorage on failure to prevent repeated failures
      localStorage.removeItem('lastRepoUrl');
      localStorage.removeItem('lastGithubPat');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies for useCallback, as all needed values are passed as arguments or come from state setters

  const fetchFileContent = useCallback(async (filePath: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentFileContent(null);

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
      const content = await fetchGitHubFileContent(fileToFetch.url, githubPat); // Use githubPat from state
      setCurrentFileContent(content);
      setSelectedFilePath(filePath);
      setActiveTab('codeViewer');
      setErrorMessage(null);
    } catch (err: any) {
      console.error(`Failed to fetch content for ${filePath}:`, err);
      setErrorMessage(err.message || `Failed to fetch content for ${filePath}.`);
      setCurrentFileContent(null);
      setSelectedFilePath(null);
    } finally {
      setIsLoading(false);
    }
  }, [repoFiles, githubPat]);

  const sendMessageToAI = useCallback(async (userQuery: string) => {
    setIsAiThinking(true);
    setErrorMessage(null);
    
    // Add user message to chat immediately
    const userMessage: ChatMessage = { role: 'user', text: userQuery };
    setChatMessages((prevMessages) => [...prevMessages, userMessage]);

    // Add a placeholder for AI's response to update incrementally
    let aiResponsePlaceholder: ChatMessage = { role: 'ai', text: '' };
    setChatMessages((prevMessages) => [...prevMessages, aiResponsePlaceholder]);
    
    try {
      const stream = analyzeCodeWithGemini(repoFiles, selectedFilePath, currentFileContent, userQuery);
      
      let fullResponseText = '';
      for await (const chunk of stream) {
        fullResponseText += chunk;
        // Update the last AI message with the new chunk
        setChatMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          // Find the last AI message (which is our placeholder or partially filled response)
          const lastAiMessageIndex = newMessages.length - 1;
          if (newMessages[lastAiMessageIndex]?.role === 'ai') {
            newMessages[lastAiMessageIndex] = { ...newMessages[lastAiMessageIndex], text: fullResponseText };
          } else {
            // Fallback: if somehow the last message isn't AI, add a new one (shouldn't happen with logic above)
            newMessages.push({ role: 'ai', text: fullResponseText });
          }
          return newMessages;
        });
      }
    } catch (err: any) {
      console.error('Error in AI interaction:', err);
      setErrorMessage(err.message || 'Failed to get AI response. Please try again.');
      if (err.message.includes("API Key selection failed or is invalid.")) {
        setIsApiKeySelected(false);
        setErrorMessage("Invalid API Key. Please select a valid key from a paid GCP project.");
      }
      // If an error occurs, ensure the AI thinking state is reset and
      // remove any incomplete AI message or mark it as errored if desired.
      // For now, the error message in state handles the notification.
    } finally {
      setIsAiThinking(false);
    }
  }, [chatMessages, setIsApiKeySelected, repoFiles, selectedFilePath, currentFileContent]);

  // Effect to load the stored repo on initial mount
  useEffect(() => {
    const storedRepoUrl = localStorage.getItem('lastRepoUrl');
    const storedGithubPat = localStorage.getItem('lastGithubPat');

    if (storedRepoUrl) {
      setRepoUrl(storedRepoUrl); // Set state to reflect stored URL
      const patToUse = storedGithubPat === '' ? null : storedGithubPat;
      setGithubPat(patToUse); // Set state to reflect stored PAT

      const loadStoredRepo = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        setChatMessages([]);
        setSelectedFilePath(null);
        setCurrentFileContent(null);
        setActiveTab('aiAssistant');

        try {
          const success = await fetchRepo(storedRepoUrl, patToUse); // Pass stored PAT directly
          if (!success) {
            // fetchRepo already handles setting error message and showing modal on failure
          }
        } catch (error) {
          console.error("Unexpected error during initial repo load:", error);
          setErrorMessage("An unexpected error occurred while loading the previous repository.");
          setShowRepoInputModal(true);
        } finally {
          setIsLoading(false);
        }
      };
      loadStoredRepo();
    } else {
      // If no stored URL, show the input modal for first-time use
      setShowRepoInputModal(true);
    }
  }, [fetchRepo]); // Depend on fetchRepo to ensure it's available

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
            <div className="w-80 flex-shrink-0 bg-gray-800 border-r border-gray-700 overflow-hidden">
              <h2 className="text-xl font-semibold text-gray-100 p-4 sticky top-0 bg-gray-800 z-10 border-b border-gray-700">Files ({repoName || 'Repository'})</h2>
              <FileTree />
            </div>

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