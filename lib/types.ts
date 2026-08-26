export type Role = "user" | "admin";
export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";
export interface Profile { id:string; user_id:string; full_name:string; username:string; mobile:string; email:string; role:Role; created_at:string }
export interface Slot { id:string; darshan_date_id:string; start_time:string; end_time:string; capacity:number; is_active:boolean; booked_count:number; remaining_capacity:number; darshan_dates?:{date:string;is_active:boolean} }
export interface Booking { id:string; booking_id:string; user_id:string; time_slot_id:string; number_of_persons:number; status:BookingStatus; created_at:string; approved_at:string|null; rejected_at:string|null; cancelled_at:string|null; profiles?:Profile; time_slots?:Slot }
