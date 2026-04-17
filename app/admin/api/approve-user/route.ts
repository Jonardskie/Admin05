import { NextResponse } from "next/server";
// Dynamic Firebase imports to avoid build-time env check
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
const { adminAuth, adminDb, getAuth } = await import('@/lib/firebase-admin');
const { getAuth: adminGetAuth } = await import('firebase-admin/auth');
const decodedToken = await adminGetAuth().verifyIdToken(idToken);

const adminDoc = await adminDb().collection("users").doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.isAdmin !== true) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

const userDoc = await adminDb().collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const email = userData?.email;
    const name =
      `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() || "User";

    if (!email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

await adminDb().collection("users").doc(uid).update({
      status: "approved",
      approvedAt: new Date().toISOString(),
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"InstaAid Support" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Your InstaAid Account Has Been Approved",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #f9f9f9; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; padding-bottom: 20px;">
            <h2 style="color: #173C94; margin: 0;">InstaAid</h2>
          </div>

          <div style="background: #ffffff; padding: 20px; border-radius: 10px;">
            <h3 style="color: #333;">Welcome, ${name}!</h3>
            <p style="font-size: 16px; color: #555;">
              Your account has been <strong>approved</strong>.
            </p>
            <p style="font-size: 16px; color: #555;">
              You can now log in to InstaAid.
            </p>
            <p style="font-size: 14px; color: #888; margin-top: 20px;">
              Thank you for registering with us.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
            <p>© ${new Date().getFullYear()} InstaAid. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Approve user error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to approve user" },
      { status: 500 }
    );
  }
}