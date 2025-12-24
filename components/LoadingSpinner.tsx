import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-indigo-500"></div>
      <span className="ml-4 text-indigo-400 text-lg font-medium">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;