const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');

const app = express();
const PORT = 5000;

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.REACT_APP_GOOGLE_CLIENT_ID || '');

// Middleware
app.use(cors());
app.use(express.json());

// Users data file
const usersFile = path.join(__dirname, 'users.json');

// Initialize users file if it doesn't exist
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, JSON.stringify([]));
}

// Helper functions
const getUsers = () => {
  const data = fs.readFileSync(usersFile, 'utf8');
  return JSON.parse(data);
};

const saveUsers = (users) => {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Routes

// Register endpoint
app.post('/api/register', (req, res) => {
  try {
    const { username, email, password, confirmPassword, agreeTerms } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    if (!agreeTerms) {
      return res.status(400).json({ 
        success: false, 
        message: 'You must agree to terms & conditions' 
      });
    }

    // Check if user already exists
    const users = getUsers();
    const userExists = users.some(u => u.email === email || u.username === username);

    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username or email already exists' 
      });
    }

    // Create new user
    const newUser = {
      id: Date.now(),
      username,
      email,
      password, // In production, hash the password!
      createdAt: new Date().toISOString(),
      verified: false
    };

    users.push(newUser);
    saveUsers(users);

    res.status(201).json({ 
      success: true, 
      message: 'Registration successful! Please check your email to verify your account.',
      user: { username, email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Find user
    const users = getUsers();
    const user = users.find(u => (u.username === username || u.email === username) && u.password === password);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Create session token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    res.status(200).json({ 
      success: true, 
      message: 'Login successful!',
      user: { 
        id: user.id,
        username: user.username, 
        email: user.email 
      },
      token,
      rememberMe
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// Forgot password endpoint
app.post('/api/forgot-password', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Check if user exists
    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      // Don't reveal if email exists for security
      return res.status(200).json({ 
        success: true, 
        message: 'If an account with this email exists, a password reset link has been sent.' 
      });
    }

    // In production, send actual email with reset link
    console.log(`Password reset link would be sent to: ${email}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Password reset link has been sent to your email!' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// Social login endpoint - verify OAuth tokens or use mock data for testing
app.post('/api/social-login', async (req, res) => {
  try {
    const { provider, token } = req.body;

    if (!provider || !token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Provider and token are required' 
      });
    }

    let profile = null;

    // Check if using mock token for testing
    const isMockToken = token.startsWith('mock-');

    if (isMockToken) {
      // Generate mock profile data for testing
      const randomId = Math.random().toString(36).substr(2, 9);
      profile = {
        id: `${provider.toLowerCase()}_${randomId}`,
        email: `user_${randomId}@${provider.toLowerCase()}.com`,
        name: `Test User ${randomId.substring(0, 5)}`,
        picture: `https://ui-avatars.com/api/?name=Test+User&background=random`
      };
      console.log(`Using mock ${provider} token for testing`);
    } else {
      // Verify real tokens with OAuth providers

      // Verify Google token
      if (provider === 'Google') {
        try {
          const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.REACT_APP_GOOGLE_CLIENT_ID
          });
          const payload = ticket.getPayload();
          profile = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture
          };
        } catch (error) {
          console.error('Google token verification failed:', error.message);
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid Google token' 
          });
        }
      }

      // Verify Facebook token
      else if (provider === 'Facebook') {
        try {
          const facebookResponse = await fetch(
            `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token}`
          );
          
          if (!facebookResponse.ok) {
            throw new Error('Failed to fetch Facebook user data');
          }

          const data = await facebookResponse.json();
          
          if (data.error) {
            throw new Error(data.error.message);
          }

          profile = {
            id: data.id,
            email: data.email,
            name: data.name,
            picture: data.picture?.data?.url
          };
        } catch (error) {
          console.error('Facebook token verification failed:', error.message);
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid Facebook token' 
          });
        }
      }

      else {
        return res.status(400).json({ 
          success: false, 
          message: 'Unsupported provider' 
        });
      }
    }

    // Get or create user
    const users = getUsers();
    let user = users.find(u => u.socialId === profile.id && u.provider === provider);

    if (!user) {
      user = {
        id: Date.now(),
        username: profile.name || profile.email.split('@')[0],
        email: profile.email,
        provider,
        socialId: profile.id,
        profilePicture: profile.picture,
        createdAt: new Date().toISOString(),
        verified: true
      };

      users.push(user);
      saveUsers(users);
    }

    const authToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    res.status(200).json({ 
      success: true, 
      message: `Login with ${provider} successful!`,
      user: { 
        id: user.id,
        username: user.username, 
        email: user.email,
        profilePicture: user.profilePicture
      },
      token: authToken
    });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// Get all users (for testing only - remove in production)
app.get('/api/users', (req, res) => {
  try {
    const users = getUsers();
    res.status(200).json({ 
      success: true, 
      users: users.map(u => ({ username: u.username, email: u.email, createdAt: u.createdAt }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Server is running' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoints:`);
  console.log(`   POST /api/register - Register new user`);
  console.log(`   POST /api/login - Login user`);
  console.log(`   POST /api/forgot-password - Request password reset`);
  console.log(`   POST /api/social-login - Social authentication`);
  console.log(`   GET  /api/users - Get all users (testing only)`);
});
