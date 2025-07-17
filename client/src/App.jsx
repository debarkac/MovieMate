import React from "react";
import Navbar from "./components/Navbar";
import {Route, Routes, useLocation} from "react-router-dom"
import Home from "./pages/Home";
import Movies from "./pages/Movies";
import MovieDetails from "./pages/MovieDetails";
import SeatLayout from "./pages/SeatLayout";
import Favourite from "./pages/Favourite";
import MyBookings from "./pages/MyBookings";
import {Toaster} from "react-hot-toast"
import Footer from "./components/Footer";
// import { Layout } from "lucide-react";
import Dashboard from "./pages/admin/Dashboard";
import AddShows from "./pages/admin/AddShows";
import ListShows from "./pages/admin/ListShows";
import ListBookings from "./pages/admin/ListBookings";
import Layout from "./pages/admin/Layout";

const App=()=>{

  //checking for admin route. for admin route the navbar and footer will not be displayed
  const isAdminRoute=useLocation().pathname.startsWith("/admin")

    return(
        <>
            <Toaster />
            {!isAdminRoute && <Navbar />}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/movies/:id" element={<MovieDetails />} />
              <Route path="/movies/:id/:date" element={<SeatLayout />} />
              <Route path="/movies/:id/:date" element={<SeatLayout />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/favourite" element={<Favourite />} />
              <Route path="/admin/*" element={<Layout />} >
                <Route index element={<Dashboard />} />
                <Route path="add-shows" element={<AddShows />} />
                <Route path="list-shows" element={<ListShows />} />
                <Route path="list-bookings" element={<ListBookings />} />
              </Route> 
            </Routes>
            {!isAdminRoute && <Footer />}
        </>
    )
}

export default App;