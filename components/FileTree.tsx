import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { RepoFile } from '../types';

interface FileTreeItemProps {
  file: RepoFile;
  level: number;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ file, level }) => {
  const {
    setSelectedFilePath,
    fetchFileContent,
    selectedFilePath,
    isLoading,
    currentFileContent, // To force re-render when file content is loaded/cleared
  } = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);

  // Close directories if selectedFilePath is cleared externally
  useEffect(() => {
    if (!selectedFilePath) {
      setIsOpen(false);
    }
  }, [selectedFilePath]);

  const handleFileClick = async (filePath: string) => {
    if (file.type === 'file') {
      if (selectedFilePath === filePath && currentFileContent) {
        // If already selected and content is present, do nothing (prevent re-fetching)
        return;
      }
      setSelectedFilePath(filePath);
      await fetchFileContent(filePath);
    } else { // It's a directory
      setIsOpen(!isOpen);
    }
  };

  const isSelected = selectedFilePath === file.path;

  return (
    <div>
      <div
        style={{ paddingLeft: `${level * 10}px` }}
        className={`flex items-center cursor-pointer py-1 px-2 rounded-md transition-colors duration-150
          ${isSelected ? 'bg-indigo-700 text-white' : 'hover:bg-gray-700'}
          ${file.type === 'file' ? 'text-gray-200' : 'text-gray-100 font-semibold'}
        `}
        onClick={() => handleFileClick(file.path)}
      >
        {file.type === 'dir' && (
          <svg
            className={`w-4 h-4 mr-2 transform transition-transform ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
          </svg>
        )}
        {file.type === 'file' && (
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 10a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm0-3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm0-3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd"></path>
          </svg>
        )}
        <span>{file.name}</span>
        {isSelected && isLoading && (
            <div className="ml-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-300"></div>
        )}
      </div>
      {isOpen && file.children && (
        <div className="ml-2">
          {file.children
            .sort((a, b) => {
              if (a.type === 'dir' && b.type === 'file') return -1;
              if (a.type === 'file' && b.type === 'dir') return 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <FileTreeItem key={child.path} file={child} level={level + 1} />
            ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC = () => {
  const { repoFiles, isLoading, errorMessage } = useContext(AppContext);

  if (isLoading && !repoFiles.length) {
    return <div className="p-4 text-gray-400">Loading repository files...</div>;
  }

  if (errorMessage && !repoFiles.length) {
    return <div className="p-4 text-red-400">Error: {errorMessage}</div>;
  }

  if (!repoFiles || repoFiles.length === 0) {
    return <div className="p-4 text-gray-400">Enter a GitHub URL to view its files.</div>;
  }

  return (
    <div className="p-4 bg-gray-800 h-full overflow-y-auto custom-scrollbar">
      {repoFiles
        .sort((a, b) => {
          if (a.type === 'dir' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        })
        .map((file) => (
          <FileTreeItem key={file.path} file={file} level={0} />
        ))}
    </div>
  );
};

export default FileTree;