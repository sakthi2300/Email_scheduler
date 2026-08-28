import { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env, db, logger } from "../config";
import { JwtPayload } from "../middleware/authGuard";

const oauthClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL
);

// Email format regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Generate the Google OAuth consent URL and redirect.
 */
export async function googleLogin(_req: Request, res: Response): Promise<void> {
  const url = oauthClient.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
  });
  res.redirect(url);
}

/**
 * Handle Google OAuth callback.
 */
export async function googleCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const code = req.query.code as string;

    if (!code) {
      res.status(400).json({
        error: { message: "Missing authorization code", code: "MISSING_CODE" },
      });
      return;
    }

    // Exchange code for tokens
    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    // Verify ID token
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({
        error: { message: "Invalid ID token", code: "INVALID_TOKEN" },
      });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      res.status(400).json({
        error: { message: "Google profile did not return an email address", code: "MISSING_EMAIL" },
      });
      return;
    }

    // Account linking & User finding logic
    let user = await db.user.findUnique({ where: { googleId } });

    if (!user) {
      // Find if email is already registered via local auth
      user = await db.user.findUnique({ where: { email } });

      if (user) {
        // Link Google OAuth to existing email/password account
        user = await db.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatarUrl: picture || user.avatarUrl,
          },
        });
        logger.info("Linked Google OAuth to existing account", { userId: user.id, email });
      } else {
        // Create new user
        user = await db.user.create({
          data: {
            googleId,
            email,
            name: name || "Unknown",
            avatarUrl: picture || null,
          },
        });
        logger.info("New user created via Google OAuth", { userId: user.id, email });
      }
    } else {
      // Update profile info on login
      user = await db.user.update({
        where: { id: user.id },
        data: {
          email,
          name: name || user.name,
          avatarUrl: picture || user.avatarUrl,
        },
      });
    }

    // Create JWT
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };

    const token = jwt.sign(jwtPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    // Set HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    logger.info("Google User authenticated", { userId: user.id, email: user.email });

    // Redirect to frontend dashboard
    res.redirect(env.FRONTEND_URL + "/dashboard");
  } catch (err) {
    next(err);
  }
}

/**
 * Local SignUp — Traditional email/password registration.
 */
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validate fields exist
    if (!name || !email || !password || !confirmPassword) {
      res.status(400).json({
        error: { message: "All fields (name, email, password, confirmPassword) are required", code: "VALIDATION_ERROR" },
      });
      return;
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({
        error: { message: "Invalid email format", code: "VALIDATION_ERROR" },
      });
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      res.status(400).json({
        error: { message: "Passwords do not match", code: "VALIDATION_ERROR" },
      });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).json({
        error: { message: "Password must be at least 6 characters long", code: "VALIDATION_ERROR" },
      });
      return;
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({
        error: { message: "Email is already registered", code: "EMAIL_EXISTS" },
      });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user in MySQL
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    // Create JWT session
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };

    const token = jwt.sign(jwtPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    // Store JWT in HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    logger.info("Local user registered and authenticated", { userId: user.id, email: user.email });

    res.status(201).json({
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Local Login — Traditional email/password sign-in.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: { message: "Email and password are required", code: "VALIDATION_ERROR" },
      });
      return;
    }

    // Find the user by email
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      res.status(401).json({
        error: { message: "Invalid email or password", code: "INVALID_CREDENTIALS" },
      });
      return;
    }

    // Compare password hash securely
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        error: { message: "Invalid email or password", code: "INVALID_CREDENTIALS" },
      });
      return;
    }

    // Create JWT session
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };

    const token = jwt.sign(jwtPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    // Store JWT in HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    logger.info("Local user authenticated", { userId: user.id, email: user.email });

    res.json({
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Logout — Clear the JWT cookie.
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie("token", { path: "/" });
  res.json({ message: "Logged out successfully" });
}

/**
 * Get current authenticated user profile.
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  res.json({ user: req.user });
}
