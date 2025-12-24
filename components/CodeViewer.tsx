import React, { useContext } from 'react';
import { AppContext } from '../App';
import LoadingSpinner from './LoadingSpinner';

const CodeViewer: React.FC = () => {
  const { currentFileContent, selectedFilePath, isLoading, errorMessage } = useContext(AppContext);

  if (isLoading && selectedFilePath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-300 min-w-0 h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (errorMessage && selectedFilePath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-red-500 p-8 min-w-0 text-lg font-medium h-full" role="alert">
        <p>Error loading file: {errorMessage}</p>
      </div>
    );
  }

  if (!selectedFilePath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-400 text-xl text-center min-w-0 px-8 h-full">
        <p>Select a file from the left panel to view its content.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-gray-900 overflow-auto custom-scrollbar min-w-0 h-full">
      <h3 className="text-xl font-mono text-indigo-400 mb-6 pb-4 sticky top-0 bg-gray-900 z-10 border-b border-gray-700 font-semibold">{selectedFilePath}</h3>
      <pre className="text-base text-gray-200 whitespace-pre-wrap break-words leading-relaxed font-mono animate-fade-in">
        <code>{currentFileContent || 'File content is empty or could not be loaded.'}</code>
      </pre>
    </div>
  );
};

export default CodeViewer;