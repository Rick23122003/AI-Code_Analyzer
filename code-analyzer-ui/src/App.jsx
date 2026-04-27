import React, { useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import axios from 'axios';
import './App.css';

function App() {
  const [code, setCode] = useState('# Type your Python code here...\n\ndef fetch_data(query):\n    # Simulate a database call\n    result = db.execute("SELECT * FROM users WHERE name = " + query)\n    return result');
  
  const [reviewType, setReviewType] = useState('Standard');
  const [reviewResult, setReviewResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReviewCode = async () => {
    setLoading(true);
    setReviewResult(null); // Clear previous results while loading
    setCopied(false);
    
    try {
      const response = await axios.post('https://ai-reviewer-backend-nz61.onrender.com/api/review', {
        rawCode: code,
        language: 'python',
        reviewType: reviewType 
      });
      setReviewResult(response.data);
    } catch (error) {
      console.error('Error fetching review:', error);
      alert('Failed to connect to the backend. Is your Python server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (reviewResult && reviewResult.refinedCode) {
      navigator.clipboard.writeText(reviewResult.refinedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>AI Code Reviewer</h1>
        <div className="controls">
          <select 
            value={reviewType} 
            onChange={(e) => setReviewType(e.target.value)} 
            className="review-select"
            disabled={loading}
          >
            <option value="Standard">Standard Review</option>
            <option value="Performance">Optimize Performance</option>
            <option value="Security">Security Audit</option>
            <option value="Style">Clean Code & Style</option>
          </select>
          
          <button onClick={handleReviewCode} disabled={loading} className="review-btn">
            {loading ? (
              <span className="spinner-container">
                <span className="spinner"></span> Analyzing...
              </span>
            ) : 'Review Code'}
          </button>
        </div>
      </header>
      
      <div className="split-screen">
        <div className="editor-pane">
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value)}
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        </div>

        <div className="feedback-pane">
          {loading && (
            <div className="loading-state">
              <div className="large-spinner"></div>
              <p>Analyzing codebase structure and logic...</p>
            </div>
          )}

          {reviewResult && !loading && (
            <div className="results active">
              <div className="summary-cards">
                <div className="card">
                  <h3>Issues Found</h3>
                  <p>{reviewResult.bugsFound}</p>
                </div>
                <div className="card">
                  <h3>Actionable Improvements</h3>
                  <ul>
                    {reviewResult.improvements.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="code-header">
                <h3>Code Comparison</h3>
                <button onClick={handleCopy} className="copy-btn">
                  {copied ? '✅ Copied!' : '📋 Copy Refined Code'}
                </button>
              </div>
              
              <div className="diff-container">
                {/* The new Diff Editor showing Original vs Refined */}
                <DiffEditor
                  height="400px"
                  language="python"
                  theme="vs-dark"
                  original={reviewResult.originalCode}
                  modified={reviewResult.refinedCode}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    renderSideBySide: true, // Set to false to show inline diffs instead
                  }}
                />
              </div>
            </div>
          )}

          {!reviewResult && !loading && (
            <div className="placeholder">
              <div className="placeholder-icon">🤖</div>
              <p>Write or paste your code on the left, select a review focus, and click "Review Code" to see the AI analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;