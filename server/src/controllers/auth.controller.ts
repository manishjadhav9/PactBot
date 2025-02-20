import { Request, Response } from "express";
import { IUser } from "../models/user.model";

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "No user session found"
      });
    }

    const user = req.user as IUser;
    
    // Don't send sensitive information
    const safeUser = {
      _id: user._id,
      email: user.email,
      name: user.name,
      picture: user.picture
    };

    res.json(safeUser);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: "Failed to get current user"
    });
  }
};

export const handleLogout = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ 
        error: "Internal Server Error",
        message: "Failed to logout" 
      });
    }
    res.json({ message: "Logged out successfully" });
  });
}; 