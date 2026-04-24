import { NextResponse } from "next/server";

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

    // ✅ Correct: use initialized Firebase Admin
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

    // ✅ Delete user from Auth and Firestore
    await adminAuth().deleteUser(uid);
    await adminDb().collection("users").doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete user error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}