import { NextResponse } from "next/server";
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

    // ✅ Correct: use initialized Firebase Admin exports
    const { adminAuth, adminDb } = await import("@/lib/firebase-admin");

    // ✅ FIX: use adminAuth(), NOT getAuth()
    const decodedToken = await adminAuth().verifyIdToken(idToken);

    const adminDoc = await adminDb()
      .collection("users")
      .doc(decodedToken.uid)
      .get();

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
      userData?.name ||
      `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
      "User";

    if (!email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

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
      subject: "Your InstaAid Account Request Was Rejected",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #f9f9f9; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; padding-bottom: 20px;">
            <h2 style="color: #173C94; margin: 0;">InstaAid</h2>
          </div>

          <div style="background: #ffffff; padding: 20px; border-radius: 10px;">
            <h3 style="color: #333;">Hello, ${name}</h3>
            <p style="font-size: 16px; color: #555;">
              We regret to inform you that your account request has been <strong>rejected</strong>.
            </p>
            <p style="font-size: 16px; color: #555;">
              You are welcome to register again anytime.
            </p>
            <p style="font-size: 14px; color: #888; margin-top: 20px;">
              Please make sure your submitted information is complete and correct before trying again.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
            <p>© ${new Date().getFullYear()} InstaAid. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    await adminAuth().deleteUser(uid);
    await adminDb().collection("users").doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reject user error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to reject user" },
      { status: 500 }
    );
  }
}