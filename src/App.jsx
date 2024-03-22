import { inject } from '@vercel/analytics';
import React, { useState, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './App.css';
import Markdown from 'react-markdown'
import html2pdf from 'html2pdf.js';
import axios from 'axios';



const NavBar = ({ onAddApiKey }) => (
  <div className="navbar">
    <div><h1>CodeContext<span style={{color : 'green'}}>AI</span></h1></div>
    <button className='button-85' onClick={onAddApiKey}>Gemini key</button>
  </div>
);

const Form = ({ githubUrl, onGithubUrlChange, userPrompt, onUserPromptChange, onGenerateResponse, isLoading }) => (
    <div className="container" >
      <br />
      <label>Enter GitHub URL:</label>
      <input
          type="text"
          value={githubUrl}
          onChange={(e) => onGithubUrlChange(e.target.value)}
      />
      <label>Enter your prompt:</label>
      <input
          type="text"
          value={userPrompt}
          onChange={(e) => onUserPromptChange(e.target.value)}
      />
      <br />
      <button onClick={onGenerateResponse} disabled={isLoading}>
        Generate Response
      </button>
      {isLoading && <p className="loading">Loading...</p>}
    </div>
);

const Response = ({ response, isResponseAvailable }) => {
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const pdfResponse = useRef();

  const generatePDF = () => {
    setPdfGenerating(true);

    const opt = {
      margin:       1,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 3 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all']}
    };

    const element = document.createElement("div");
    element.innerHTML = pdfResponse.current.innerHTML;

    html2pdf().set(opt).from(element).save('CodeContextA.pdf').then(() => {
      setPdfGenerating(false);
    });
  };

  return (
      <div className="container">
        <h2>Conversation History:</h2>
        <ul><Markdown>{conversationHistory}</Markdown></ul>
        <h2>CodeContextAI says:</h2>
        <ul><Markdown>{response}</Markdown></ul>
        {isResponseAvailable && (
            <button className="download-button" onClick={generatePDF} disabled={pdfGenerating}>
              {pdfGenerating ? "Generating PDF..." : "Download as PDF"}
            </button>
        )}
      </div>
  );
};

const MadeBy = () => (
  <div className='made-by'>Developed by Rishabh Rai</div>
);
const App = () => {
  const apiKeyDefault = import.meta.env.VITE_API_KEY
  const [apiKey, setApiKey] = useState(apiKeyDefault);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isResponseAvailable, setIsResponseAvailable] = useState(false);
  const genAI = new GoogleGenerativeAI(apiKey);

  const [conversationHistory, setConversationHistory] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubCode, setGithubCode] = useState('');

  const handleGenerateResponse = async () => {
    try {
      setIsLoading(true);

      if (!genAI) {
        console.error('Invalid key');
        return;
      }

      // Fetch the code from the GitHub URL only if it's not already fetched
      if (!githubCode) {
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const response = await axios.get(proxyUrl + githubUrl);
        const code = response.data;
        setGithubCode(code);
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `You are an AI model tasked with providing coding advice to a developer. The developer will ask you questions based on the following code context: ${githubCode}. Previous conversation: ${conversationHistory}. User's prompt: ${userPrompt}`;

      const result = await model.generateContent(prompt);
      const generatedResponse = await result.response.text();

      setConversationHistory(conversationHistory + '\n' + generatedResponse);

      setResponse(generatedResponse);
      setIsResponseAvailable(true);
    } catch (error) {
      console.error('Error generating content:', error);
      if (error.message.includes('404')) {
        alert("The provided GitHub URL is not valid.");
      } else if (error.message.includes('403')) {
        alert("You have hit the GitHub API rate limit. Please wait a while before trying again.");
      } else {
        alert("An unknown error occurred. Please check the console for more details.");
      }
    } finally {
      setIsLoading(false);
    }
  };

 

  const handleSaveApiKey = () => {
    setShowApiKeyInput(false);
  };

  const handleAddApiKey = () => {
    setShowApiKeyInput(true);
  };

  const handleApiKeyChange = (event) => {
    const inputApiKey = event.target.value.trim();

    if (inputApiKey === apiKeyDefault) {
      // If the input is the default key, don't update the state
      return;
    }

    setApiKey(inputApiKey || apiKeyDefault); // Set the default API key if user input is empty
  };


  return (
      <div>
        <NavBar onAddApiKey={handleAddApiKey} />
        {showApiKeyInput && (
            <div className="api-key-input container">
              <label>Enter API Key:</label>
              <input type="text" placeholder='Leave it empty to use the default API key' value={apiKey === apiKeyDefault ? '' : apiKey} onChange={handleApiKeyChange} />
              <button onClick={handleSaveApiKey}>Save</button>
            </div>
        )}
        <Form
            githubUrl={githubUrl}
            onGithubUrlChange={setGithubUrl}
            onGenerateResponse={handleGenerateResponse}
            isLoading={isLoading}
        />
        {response && <Response response={response} isResponseAvailable={isResponseAvailable} conversationHistory={conversationHistory} />}
        <MadeBy></MadeBy>
      </div>
  );
};

inject();

export default App;
