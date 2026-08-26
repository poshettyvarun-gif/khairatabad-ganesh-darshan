import { NextResponse } from "next/server";

import { makeBookingPassPdf } from "@/lib/pdf";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BookingForPass = {
  booking_id: string;
  number_of_persons: number;
  approved_at: string | null;
  profiles: { full_name: string; mobile: string } | { full_name: string; mobile: string }[];
  time_slots:
    | { start_time: string; end_time: string; darshan_dates: { date: string } | { date: string }[] }
    | { start_time: string; end_time: string; darshan_dates: { date: string } | { date: string }[] }[];
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = crypto.randomUUID();

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: rawBooking, error: bookingError } = await supabase
      .from("bookings")
      .select("booking_id,number_of_persons,approved_at,profiles!bookings_user_id_fkey(full_name,mobile),time_slots(start_time,end_time,darshan_dates(date))")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "approved")
      .maybeSingle();

    if (bookingError) {
      console.error("[booking-pdf] booking lookup failed", { requestId, bookingId: id, message: bookingError.message });
      return NextResponse.json({ error: "Unable to prepare the booking pass.", requestId }, { status: 500 });
    }
    if (!rawBooking) return NextResponse.json({ error: "Approved booking not found." }, { status: 404 });

    const booking = rawBooking as BookingForPass;
    const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
    const slot = Array.isArray(booking.time_slots) ? booking.time_slots[0] : booking.time_slots;
    const darshanDate = Array.isArray(slot?.darshan_dates) ? slot.darshan_dates[0] : slot?.darshan_dates;
    if (!profile || !slot || !darshanDate) {
      console.error("[booking-pdf] approved booking has incomplete pass details", { requestId, bookingId: id });
      return NextResponse.json({ error: "Booking pass details are incomplete.", requestId }, { status: 500 });
    }

    const pdf = await makeBookingPassPdf({
      bookingId: booking.booking_id,
      fullName: profile.full_name,
      mobile: profile.mobile,
      date: darshanDate.date,
      startTime: slot.start_time,
      endTime: slot.end_time,
      persons: booking.number_of_persons,
      approvedAt: booking.approved_at,
    });

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Khairatabad_Ganesh_Darshan_${booking.booking_id}.pdf"`,
        "Content-Length": String(pdf.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[booking-pdf] generation failed", {
      requestId,
      bookingId: id,
      message: error instanceof Error ? error.message : "Unknown PDF generation error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Unable to generate the booking pass. Please try again.", requestId }, { status: 500 });
  }
}
