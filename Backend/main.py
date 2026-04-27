import os
import json
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Update the expected payload
class CodeReviewRequest(BaseModel):
    rawCode: str
    language: Optional[str] = "python"
    reviewType: Optional[str] = "Standard" # Added the new parameter

@app.post("/api/review")
async def review_code(request: CodeReviewRequest):
    try:
        if not request.rawCode.strip():
            raise HTTPException(status_code=400, detail="Please provide code to review.")

        model = genai.GenerativeModel('gemini-2.5-flash')

        # 2. Define specific instructions based on the review type
        focus_prompts = {
            "Standard": "Provide a general code review focusing on syntax, logic, and standard best practices.",
            "Performance": "Focus heavily on time and space complexity. Suggest optimizations for faster execution and lower memory usage. Highlight any inefficient loops or data structures.",
            "Security": "Focus strictly on security vulnerabilities. Look for injection risks, insecure data handling, lack of sanitization, and potential exploits.",
            "Style": "Focus on clean code principles, naming conventions, modularity, and readability. Ensure the code strictly adheres to industry formatting standards."
        }

        # Retrieve the specific instruction, defaulting to Standard if something goes wrong
        specific_instruction = focus_prompts.get(request.reviewType, focus_prompts["Standard"])

        # 3. Inject the dynamic instruction into the main prompt
        prompt = f"""
        You are an expert code reviewer. {specific_instruction}
        
        Analyze the following {request.language} code.
        
        Return your response strictly as a JSON object with NO markdown formatting, NO backticks, and NO extra text. 
        The JSON must contain these exact keys:
        - "originalCode": (string) The exact original code provided.
        - "refinedCode": (string) The corrected and optimized code.
        - "improvements": (array of strings) A list of specific changes or optimizations you made based on the requested review type.
        - "bugsFound": (string) A short explanation of any issues found.

        Code to review:
        {request.rawCode}
        """

        response = model.generate_content(prompt)
        ai_response_dict = json.loads(response.text.strip())

        return ai_response_dict

    except json.JSONDecodeError:
        print("Failed to parse AI response as JSON.")
        raise HTTPException(status_code=500, detail="AI response format was invalid.")
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process code review.")