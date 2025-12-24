import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from '../App';

/**
 * Declares the `window.aistudio` interface for TypeScript,
 * as it's assumed to be pre-configured and globally available.
 */
// Fix: Define the AIStudio interface explicitly to resolve type conflicts
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio: AIStudio;
  }
}

const ApiKeyChecker: React.FC = () => {
  const { isApiKeySelected, setIsApiKeySelected, setErrorMessage } = useContext(AppContext);
  const [checkingKey, setCheckingKey] = useState(true);

  const checkAndPromptApiKey = async () => {
    setCheckingKey(true);
    setErrorMessage(null);
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(selected);
        if (!selected) {
          console.warn("API key not selected. Please select an API key.");
        }
      } catch (error) {
        console.error("Error checking API key:", error);
        setErrorMessage("Could not check API key. Ensure you are running in a valid AI Studio environment.");
        setIsApiKeySelected(false);
      }
    } else {
      setErrorMessage("`window.aistudio` API not found. This app requires a specific execution environment.");
      setIsApiKeySelected(false);
    }
    setCheckingKey(false);
  };

  const handleSelectKey = async () => {
    setErrorMessage(null);
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        // Assume success after opening the dialog and proceed
        setIsApiKeySelected(true);
      } catch (error) {
        console.error("Error opening API key selection dialog:", error);
        setErrorMessage("Failed to open API key selection dialog.");
        setIsApiKeySelected(false);
      }
    } else {
      setErrorMessage("`window.aistudio` API not found. Cannot open key selection dialog.");
      setIsApiKeySelected(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    checkAndPromptApiKey();
  }, []); // Run once on mount

  if (checkingKey) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg shadow-lg text-gray-300">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-lg">Checking API key availability...</p>
      </div>
    );
  }

  if (!isApiKeySelected) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-red-900 rounded-lg shadow-lg text-white">
        <p className="text-lg font-semibold mb-4 text-center">
          A paid API Key is required for advanced Gemini models (like `gemini-3-pro-preview`).
        </p>
        <p className="mb-4 text-center">
          Please select an API key from a paid GCP project to proceed.
        </p>
        <button
          onClick={handleSelectKey}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-red-900"
        >
          Select API Key
        </button>
        <p className="mt-4 text-sm text-gray-200 text-center">
          More info on billing:{" "}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-300 hover:underline"
          >
            ai.google.dev/gemini-api/docs/billing
          </a>
        </p>
      </div>
    );
  }

  return null; // API key is selected, render nothing.
};

export default ApiKeyChecker;