// src/services/api.ts

const API_URL = "http://127.0.0.1:8000";

// 1. Define the shape of the data needed to register
export interface UserRegisterData {
  username: string;
  email: string;
  password: string;
}

// 2. Define the shape of the response (the User Profile)
export interface UserProfile {
  username: string;
  email: string;
  bio?: string; // '?' means optional
}

// 3. Add types to function arguments and return promise
// src/services/api.ts

export async function registerUser(userData: UserRegisterData): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/users/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();

    // --- NEW LOGIC START ---
    let errorMessage = "Registration failed";

    // Check if FastAPI returned a list of validation errors
    if (Array.isArray(errorData.detail)) {
        // Extract the 'msg' from the first error in the list
        errorMessage = errorData.detail[0].msg;
    }
    // Check if it's a simple error string (like "User already exists")
    else if (typeof errorData.detail === 'string') {
        errorMessage = errorData.detail;
    }
    // --- NEW LOGIC END ---

    throw new Error(errorMessage);
  }

  return response.json();
}