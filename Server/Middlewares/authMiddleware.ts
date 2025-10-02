import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Define the structure of the JWT payload
interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader: string | undefined = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ message: "Authorization required" });
      return;
    }

    const token: string = authHeader.split(" ")[1];
    
    if (!token) {
      res.status(401).json({ message: "Token not provided" });
      return;
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not configured");
      res.status(500).json({ message: "Server configuration error" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    req.user = decoded; // Attach user data from the token
    next();
  } catch (error: unknown) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authenticate; 