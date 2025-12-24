import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';

const RepoInput: React.FC = () => {
  const {
    repoUrl,
    setRepoUrl,
    fetchRepo,
    isLoading,
    errorMessage,
    setErrorMessage,
    clearState,
  } = useContext(AppContext);
  const [inputUrl, setInputUrl] = useState(repoUrl);

  useEffect(() => {
    setInputUrl(repoUrl); // Sync internal state if context changes
  }, [repoUrl]);

  const handleFetchClick = async () => {
    setErrorMessage(null); // Clear previous errors
    if (!inputUrl) {
      setErrorMessage("Please enter a GitHub repository URL.");
      return;
    }

    const githubUrlRegex = /^https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)(\/.*)?$/;
    const match = inputUrl.match(githubUrlRegex);

    if (!match) {
      setErrorMessage("Invalid GitHub URL format. Please use 'https://github.com/owner/repo'.");
      return;
    }

    setRepoUrl(inputUrl);
    await fetchRepo(inputUrl);
  };

  const handleClearClick = () => {
    setInputUrl('');
    clearState();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      handleFetchClick();
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-800 border-b border-gray-700">
      <h2 className="text-xl font-semibold text-gray-100 mb-2">GitHub Repository</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., https://github.com/facebook/react"
          className="flex-grow p-2 rounded-md bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent focus:border-indigo-500"
          disabled={isLoading}
        />
        <button
          onClick={handleFetchClick}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-md transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          disabled={isLoading}
        >
          {isLoading ? 'Fetching...' : 'Fetch Repo'}
        </button>
        <button
          onClick={handleClearClick}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md shadow-md transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          disabled={isLoading}
        >
          Clear
        </button>
      </div>
      {errorMessage && (
        <p className="text-red-400 text-sm">{errorMessage}</p>
      )}
    </div>
  );
};

export default RepoInput;