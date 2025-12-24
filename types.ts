export interface RepoFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  url?: string; // URL for fetching raw content, if it's a file
  sha: string; // SHA hash of the file/directory for unique identification
  children?: RepoFile[]; // For directories
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export interface AppContextType {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  repoOwner: string;
  repoName: string;
  setRepoDetails: (owner: string, name: string) => void;
  repoFiles: RepoFile[];
  setRepoFiles: (files: RepoFile[]) => void;
  selectedFilePath: string | null;
  setSelectedFilePath: (path: string | null) => void;
  currentFileContent: string | null;
  setCurrentFileContent: (content: string | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  isAiThinking: boolean;
  setIsAiThinking: (thinking: boolean) => void;
  isApiKeySelected: boolean;
  setIsApiKeySelected: (selected: boolean) => void;
  fetchRepo: (url: string) => Promise<void>;
  fetchFileContent: (filePath: string) => Promise<void>;
  sendMessageToAI: (userQuery: string, contextCode: string | null) => Promise<void>;
  clearState: () => void;
}
