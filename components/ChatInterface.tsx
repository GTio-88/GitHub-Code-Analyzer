import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { ChatMessage } from '../types';
import LoadingSpinner from './LoadingSpinner';

const ChatInterface: React.FC = () => {
  const {
    chatMessages,
    sendMessageToAI,
    isAiThinking,
    currentFileContent,
    selectedFilePath,
    errorMessage,
    repoFiles,
  } = useContext(AppContext);
  const [userQuery, setUserQuery] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!userQuery.trim() || isAiThinking) return;

    setUserQuery(''); // Clear input

    // Only send the current file content if a file is selected
    const contextCode = selectedFilePath ? currentFileContent : null;

    try {
      await sendMessageToAI(userQuery.trim(), contextCode);
    } catch (error) {
      console.error("Error sending message to AI:", error);
      // Error message will be handled by App.tsx's `setErrorMessage`
    }
  };

  const handleCopyAiResponse = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('AI response copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  };

  const isSendDisabled = isAiThinking || !userQuery.trim() || !repoFiles.length;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">
        {chatMessages.length === 0 && (
          <div className="text-gray-400 text-center py-8 text-xl px-4">
            Start by asking about the selected code, or general coding advice for the repo.
            <br/>
            <span className="text-indigo-300 font-medium">(Select a file for AI to analyze its content.)</span>
          </div>
        )}
        {chatMessages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in-up`}>
            <div
              className={`max-w-xl p-5 rounded-2xl shadow-lg text-lg leading-relaxed
                ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none' // Rounded everywhere except bottom-right
                    : 'bg-gray-700 text-gray-100 rounded-bl-none' // Rounded everywhere except bottom-left
                }`}
            >
              <p className="font-bold mb-2">{message.role === 'user' ? 'You' : 'AI'}:</p>
              <pre className="whitespace-pre-wrap font-sans text-base md:text-lg">{message.text}</pre>
              {message.role === 'ai' && (
                <button
                  onClick={() => handleCopyAiResponse(message.text)}
                  className="mt-4 px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-700"
                  aria-label="Copy AI response to clipboard"
                >
                  Copy to clipboard
                </button>
              )}
            </div>
          </div>
        ))}
        {isAiThinking && (
          <div className="flex justify-start animate-slide-in-up">
            <div className="max-w-xl p-5 rounded-2xl shadow-lg bg-gray-700 text-gray-100 rounded-bl-none">
              <p className="font-bold mb-2">AI:</p>
              <LoadingSpinner />
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="text-red-500 text-center py-4 text-lg font-medium" role="alert">Error: {errorMessage}</div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700 flex gap-4 bg-gray-800">
        <textarea
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isSendDisabled) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={
            selectedFilePath
              ? `Ask about '${selectedFilePath}' or general repo advice...`
              : 'Enter a GitHub URL first, then select a file to ask questions.'
          }
          rows={4}
          className="flex-grow p-4 rounded-xl bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 border border-transparent focus:border-indigo-600 resize-y custom-scrollbar transition-colors duration-200 text-base"
          disabled={isSendDisabled}
          aria-label="Chat input for AI assistant"
        ></textarea>
        <button
          onClick={handleSendMessage}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg transition-all duration-200 ease-in-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-gray-800 self-end"
          disabled={isSendDisabled}
          aria-label="Send message to AI"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;