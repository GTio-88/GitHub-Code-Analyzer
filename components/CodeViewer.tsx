import React, { useContext } from 'react';
import { AppContext } from '../App';
import LoadingSpinner from './LoadingSpinner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Helper to determine the language for syntax highlighting
const getLanguage = (filePath: string): string => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'css':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'go':
      return 'go';
    case 'php':
      return 'php';
    case 'rb':
      return 'ruby';
    case 'sh':
      return 'bash';
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'scss':
      return 'scss';
    case 'less':
      return 'less';
    default:
      return 'textile'; // Fallback to plain text or a generic style
  }
};

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

  const language = selectedFilePath ? getLanguage(selectedFilePath) : 'textile';

  return (
    <div className="flex-1 p-8 bg-gray-900 overflow-auto custom-scrollbar min-w-0 h-full">
      <h3 className="text-xl font-mono text-indigo-400 mb-6 pb-4 sticky top-0 bg-gray-900 z-10 border-b border-gray-700 font-semibold">{selectedFilePath}</h3>
      <SyntaxHighlighter
        language={language}
        style={materialDark}
        showLineNumbers={true}
        wrapLines={true}
        customStyle={{
          backgroundColor: 'transparent', // Make background transparent to use parent's bg-gray-900
          padding: '0', // Remove default padding
          margin: '0', // Remove default margin
          fontSize: '1rem', // Match text-base
          lineHeight: '1.6', // Match leading-relaxed
          fontFamily: 'monospace', // Ensure monospace font
          overflowX: 'hidden', // Hide horizontal scrollbar within highlighter if content wraps
        }}
        codeTagProps={{
          style: {
            fontSize: '1rem',
            lineHeight: '1.6',
            fontFamily: 'monospace',
          },
        }}
        lineNumberContainerStyle={{
          float: 'left',
          paddingRight: '1em',
          textAlign: 'right',
          color: '#6b7280', // Tailwind gray-500
          userSelect: 'none',
        }}
      >
        {currentFileContent || 'File content is empty or could not be loaded.'}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeViewer;