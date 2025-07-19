import express from "express";
import { getFavourites, getUserBookings, updateFavourite } from "../controllers/userControllers.js";

const userRouter=express.Router();

userRouter.get("/bookings",getUserBookings);
userRouter.get("/update-favorite",updateFavourite);
userRouter.get("/favorites",getFavourites);

export default userRouter;
