import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from '../App';

/**
 * The `window.aistudio` interface is assumed to be pre-configured and globally available
 * in the execution context, as per coding guidelines.
 * Therefore, an explicit `declare global` block within this component is not needed
 * and can lead to declaration conflicts.
 */

const ApiKeyChecker: React.FC = () => {
  // Fix: Ensure AppContext is not undefined by checking it before destructuring.
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('ApiKeyChecker must be used within an AppContext.Provider');
  }
  const { isApiKeySelected, setIsApiKeySelected, setErrorMessage } = context;
  const [checkingKey, setCheckingKey] = useState(true);

  const checkAndPromptApiKey = async () => {
    setCheckingKey(true);
    setErrorMessage(null);
    // Fix: Access window.aistudio directly as it's assumed to be globally available.
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
    // Fix: Access window.aistudio directly as it's assumed to be globally available.
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
    checkAndPromptApiKey();
  }, []); // Run once on mount

  if (checkingKey) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center animate-fade-in">
        <div className="flex flex-col items-center justify-center p-10 bg-gray-900 rounded-2xl shadow-2xl text-gray-300 animate-scale-in">
          <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-indigo-500 mb-6"></div>
          <p className="text-xl font-medium">Checking API key availability...</p>
        </div>
      </div>
    );
  }

  if (!isApiKeySelected) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center animate-fade-in">
        <div className="flex flex-col items-center justify-center p-10 bg-gray-900 rounded-2xl shadow-2xl text-white max-w-lg text-center border border-indigo-600 animate-scale-in">
          <p className="text-3xl font-bold mb-4 text-indigo-400">
            API Key Required
          </p>
          <p className="mb-6 text-lg text-gray-200">
            A paid API Key is essential for utilizing advanced Gemini models (like `gemini-3-pro-preview`).
            Please select an API key from a paid Google Cloud Project to proceed.
          </p>
          <button
            onClick={handleSelectKey}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg transition duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Select API Key
          </button>
          <p className="mt-6 text-sm text-gray-400">
            For more information on billing, visit:{" "}
            <a
              href="https://ai.google.dev/gemini-api/docs/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 hover:underline font-medium"
            >
              ai.google.dev/gemini-api/docs/billing
            </a>
          </p>
        </div>
      </div>
    );
  }

  return null; // API key is selected, render nothing.
};

export default ApiKeyChecker;