import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

//Inngest function to save user data to a database
const syncUserCreation=inngest.createFunction(
    {id: "sync-user-from-clerk"},
    {event:"clerk/user.created"},
    async ({event})=>{
        const {id,first_name,last_name,email_addresses,image_url}=event.data
        const userData={
            _id:id,
            email:email_addresses[0].email_addresses,
            name:first_name+" "+last_name,
            image:image_url
        }

        //storing data to database
        await User.create(userData)
    }
)

//Inngest function to delete user from database
const syncUserDelete=inngest.createFunction(
    {id: "delete-user-with-clerk"},
    {event:"clerk/user.deleted"},
    async ({event})=>{
        const {id}=event.data
        await User.findByIdAndDelete(id)
    }
)

//Inngest function to update user data in database
const syncUserUpdate=inngest.createFunction(
    {id: "update-user-from-clerk"},
    {event:"clerk/user.updated"},
    async ({event})=>{
        const {id,first_name,last_name,email_addresses,image_url}=event.data
        const userData={
            _id:id,
            email:email_addresses[0].email_addresses,
            name:first_name+" "+last_name,
            image:image_url
        }
        await User.findByIdAndUpdate(id,userData)
    }
)

//Inngest function cancel booking and release seats after 10 minutes of booking if payment is not done
const releaseSeatsAndDeleteBooking=inngest.createFunction(
    {id:"release-seats-delete-booking"},
    {event:"app/checkpayment"},
    async({event,step})=>{
        const tenMinutesLater=new Date(Date.now()+10*60*1000)
        await step.sleepUntil("wait-for-10-minutes",tenMinutesLater)
        await step.run("check-payment-status",async()=>{
            const bookingId=event.data.bookingId
            const booking=await Booking.findById(bookingId)
            
            //if payment is not made delete booking
            if(!booking.isPaid){
                const show=await Show.findById(booking.show)
                booking.bookedSeats.forEach((seat)=>{
                    delete show.occupiedSeats[seat]
                })
                show.markModified("occupiedSeats")
                await show.save()
                await Booking.findByIdAndDelete(booking._id)
            }
        })
    }
)

//Inngest function send email when user books a show
const sendBookingConfirmationEmail=inngest.createFunction(
    {id:"send-booking-confirmation-email"},
    {event:"app/show.booked"},
    async ({event,step})=>{
        const {bookingId}=event.data
        
        const booking=await Booking.findById(bookingId).populate({
            path:"show",
            populate:{path:"movie",model:"Movie"}
        }).populate("user")

        await sendEmail({
            to:booking.user.email,
            subject:`Payment Confirmation: "${booking.show.movie.title}" booked`,
            body:`<div><h1>Your booking is successful</h1></div> `
        })
    }
)

//Inngest function to remind
const sendShowReminders=inngest.createFunction(
    {id:"send-show-reminders"},
    {cron:"0 */8 * * *"},
    async({step})=>{
        const now=new Date()
        const in8Hours=new Date(now.getTime()+8*60*60*1000)
        const windowStart=new Date(in8Hours.getTime()-10*60*1000)

        const reminderTasks=await step.run("prepare-reminder-tasks",async ()=>{
            const shows=await Show.find({
                showTime:{$gte:windowStart,$lte:in8Hours}
            }).populate("movie")

            const tasks=[]

            for(const show of shows){
                if(!show.movie || !show.occupiedSeats)
                    continue

                const userId=[...new Set(Object.values(show.occupiedSeats))]
                if(userId.length===0)
                    continue

                const users=await User.find({_id:{$in:userId}}).select("name email")

                for(const user of users){
                    tasks.push({
                        userEmail:user.email,
                        username:user.name,
                        movieTitle:show.movie.title,
                        showTime:show.showTime
                    })
                }
            }
            return tasks
        })
        if(reminderTasks.length===0)
            return {sent:0,message:"No reminders to send"}

        //send reminder emails
        const results=await step.run("send-all-reminders",async()=>{
            return await Promise.allSettled(
                reminderTasks.map(task=>sendEmail({
                    to:task.userEmail,
                    subject:`Reminder: Your movie "${task.movieTitle}" starts soon`,
                    body:`<div><h1>Reminder for your movie</h1></div>`
                }))
            )
        })
        const sent=results.filter(r=>r.status==="fulfilled").length
        const failed=results.length-sent

        return{
            sent,
            failed,
            message:`Sent ${sent} reminder, ${failed} failed.`
        }
    }
)

//Inngest function to send notifications when a new show is added
const sendNewShowNotifications=inngest.createFunction(
    {id:"send-new-show-notifications"},
    {event:"app/show.added"},
    async({event})=>{
        const {movieTitle}=event.data
        const users=await User.find({})

        for(const user of users){
            const userEmail=user.email
            const userName=user.name

            const subject=`New show added:${movieTitle}`
            const body=`<div><h1>New show added</h1></div>`

            await sendEmail({
                to:userEmail,
                subject,
                body
            })
        }

        return {message:"Notification sent"}

    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation,syncUserDelete,syncUserUpdate,releaseSeatsAndDeleteBooking,sendBookingConfirmationEmail,sendShowReminders,sendNewShowNotifications];