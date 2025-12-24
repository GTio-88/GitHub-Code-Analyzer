import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';

interface RepoInputProps {
  onClose: () => void;
  onRepoFetched: () => void;
}

const RepoInput: React.FC<RepoInputProps> = ({ onClose, onRepoFetched }) => {
  const {
    repoUrl,
    setRepoUrl,
    githubPat, // New: Get githubPat from context
    setGithubPat, // New: Get setGithubPat from context
    fetchRepo,
    isLoading,
    errorMessage, // Keep errorMessage for displaying it if fetchRepo returns false
    setErrorMessage,
    clearState,
  } = useContext(AppContext);
  const [inputUrl, setInputUrl] = useState(repoUrl);
  const [patInput, setPatInput] = useState(githubPat || ''); // New: State for PAT input

  useEffect(() => {
    // Sync internal state if context changes (e.g., clearState is called)
    setInputUrl(repoUrl);
    setPatInput(githubPat || ''); // Sync PAT input as well
  }, [repoUrl, githubPat]);

  const handleFetchClick = async () => {
    setErrorMessage(null); // Clear previous errors
    if (!inputUrl.trim()) {
      setErrorMessage("Please enter a GitHub repository URL.");
      return;
    }

    // Updated regex to correctly extract owner and repo name, ignoring optional .git suffix
    const githubUrlRegex = /^https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?(\/.*)?$/;
    const match = inputUrl.match(githubUrlRegex);

    if (!match) {
      setErrorMessage("Invalid GitHub URL format. Please use 'https://github.com/owner/repo'.");
      return;
    }

    setRepoUrl(inputUrl);
    setGithubPat(patInput.trim() || null); // Set PAT to context before fetching
    
    // Call fetchRepo and directly check its return value
    const success = await fetchRepo(inputUrl);

    // If fetchRepo was successful, close the modal
    if (success) { 
      onRepoFetched();
    }
    // If not successful, the errorMessage will have been set by fetchRepo itself,
    // and the modal will remain open to display it.
  };

  const handleClearClick = () => {
    setInputUrl('');
    setPatInput(''); // Clear PAT input
    clearState();
    // Keep modal open if clearing, user might want to enter a new URL
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      event.preventDefault(); // Prevent form submission
      handleFetchClick();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold text-gray-100">Enter GitHub Repository URL</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., https://github.com/google/gemini-api-cookbook (public repo)"
          className="flex-grow p-4 h-14 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 border border-transparent focus:border-indigo-600 transition-colors duration-200 text-base"
          disabled={isLoading}
          aria-label="GitHub repository URL input"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="github-pat" className="text-lg text-gray-200 flex items-center gap-2">
          GitHub Personal Access Token (Optional)
          <span className="text-sm text-gray-400">
            <a
              href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 hover:underline ml-1"
            >
              (Why do I need this?)
            </a>
          </span>
        </label>
        <input
          id="github-pat"
          type="password"
          value={patInput}
          onChange={(e) => setPatInput(e.target.value)}
          placeholder="Enter PAT for private repos (e.g., ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)"
          className="flex-grow p-4 h-14 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 border border-transparent focus:border-indigo-600 transition-colors duration-200 text-base"
          disabled={isLoading}
          aria-label="GitHub Personal Access Token input"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleFetchClick}
          className="px-6 py-3 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 ease-in-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-gray-900 whitespace-nowrap"
          disabled={isLoading}
          aria-label="Fetch Repository"
        >
          {isLoading ? 'Fetching...' : 'Fetch Repo'}
        </button>
        <button
          onClick={handleClearClick}
          className="px-6 py-3 h-14 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 ease-in-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 whitespace-nowrap"
          disabled={isLoading}
          aria-label="Clear Input"
        >
          Clear
        </button>
      </div>
      {errorMessage && (
        <p className="text-red-500 text-sm flex items-center gap-2 font-medium" role="alert">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default RepoInput;