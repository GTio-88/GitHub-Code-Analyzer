import React, { useContext } from 'react';
import { AppContext } from '../App';
import LoadingSpinner from './LoadingSpinner';

const CodeViewer: React.FC = () => {
  const { currentFileContent, selectedFilePath, isLoading, errorMessage } = useContext(AppContext);

  if (isLoading && selectedFilePath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-300">
        <LoadingSpinner />
      </div>
    );
  }

  if (errorMessage && selectedFilePath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-red-400 p-4">
        <p>Error loading file: {errorMessage}</p>
      </div>
    );
  }

  if (!selectedFilePath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-400">
        <p>Select a file from the left panel to view its content.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 bg-gray-900 overflow-auto custom-scrollbar">
      <h3 className="text-lg font-mono text-indigo-400 mb-4 sticky top-0 bg-gray-900 pb-2 z-10 border-b border-gray-700">{selectedFilePath}</h3>
      <pre className="text-sm text-gray-200 whitespace-pre-wrap break-words">
        <code>{currentFileContent || 'File content is empty or could not be loaded.'}</code>
      </pre>
    </div>
  );
};

export default CodeViewer;