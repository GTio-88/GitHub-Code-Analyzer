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

    // Add user message to chat history immediately
    const newUserMessage: ChatMessage = { role: 'user', text: userQuery.trim() };
    // Update context state directly, assuming setChatMessages is available via context
    // This is a simplified approach, in a larger app you might use a reducer or a global state manager
    // For this app, App.tsx's state update function will be used directly.
    // However, as setChatMessages is a setter, we can predict the state update here for immediate UI feedback.
    // The actual state update will happen in App.tsx after `sendMessageToAI`.
    // For now, let's rely on the context to update the full history after the AI responds to avoid race conditions.

    setUserQuery(''); // Clear input

    // Only send the current file content if a file is selected
    const contextCode = selectedFilePath ? currentFileContent : null;

    try {
      await sendMessageToAI(newUserMessage.text, contextCode);
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
    <div className="flex flex-col h-full bg-gray-800 border-l border-gray-700">
      <h2 className="text-xl font-semibold text-gray-100 p-4 border-b border-gray-700">AI Assistant</h2>

      <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
        {chatMessages.length === 0 && (
          <div className="text-gray-400 text-center py-8">
            Start by asking about the selected code, or general coding advice for the repo.
            <br/>
            (Select a file for AI to analyze its content.)
          </div>
        )}
        {chatMessages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[70%] p-3 rounded-lg shadow-md ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <p className="font-bold mb-1">{message.role === 'user' ? 'You' : 'AI'}:</p>
              <pre className="whitespace-pre-wrap font-sans text-sm">{message.text}</pre>
              {message.role === 'ai' && (
                <button
                  onClick={() => handleCopyAiResponse(message.text)}
                  className="mt-2 px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-700"
                >
                  Copy to clipboard
                </button>
              )}
            </div>
          </div>
        ))}
        {isAiThinking && (
          <div className="flex justify-start">
            <div className="max-w-[70%] p-3 rounded-lg shadow-md bg-gray-700 text-gray-100">
              <p className="font-bold mb-1">AI:</p>
              <LoadingSpinner />
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="text-red-400 text-center py-2">Error: {errorMessage}</div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700 flex gap-2">
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
          rows={3}
          className="flex-grow p-2 rounded-md bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent focus:border-indigo-500 resize-none custom-scrollbar"
          disabled={isSendDisabled}
        ></textarea>
        <button
          onClick={handleSendMessage}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-md transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 self-end"
          disabled={isSendDisabled}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
