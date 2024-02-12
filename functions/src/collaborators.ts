import {
  SendSmtpEmail,
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
} from "@sendinblue/client";
import { auth, firestore as firestoreAdmin } from "firebase-admin";
import { firestore } from "firebase-functions/v1";

export const onCollaborationRequestChanged = firestore
  .document("collaboratorRequests/{collabId}")
  .onUpdate(async (change) => {
    const afterStatus = change.after.get("status");
    const beforeStatus = change.before.get("status");

    if (afterStatus === beforeStatus) {
      return;
    }

    if (afterStatus === "accepted") {
      // Get the user by the user email
      const user = await auth().getUserByEmail(change.after.get("email"));
      const name = user.displayName || user.email || user.uid;
      const scheduleId = change.after.get("scheduleId");

      // Add the user to the collaborators
      const scheduleDocRef = firestoreAdmin()
        .collection("schedules")
        .doc(scheduleId);
      const membershipDocRef = firestoreAdmin()
        .collection("scheduleMembership")
        .doc(scheduleId);

      const batch = firestoreAdmin().batch();

      batch.update(scheduleDocRef, {
        collaborators: firestoreAdmin.FieldValue.arrayUnion(user.uid),
      });

      batch.update(membershipDocRef, {
        [`collaborators.${user.uid}`]: {
          id: user.uid,
          name,
          email: user.email,
        },
      });

      batch.delete(change.after.ref);

      await batch.commit();
      return;
    }

    if (afterStatus === "rejected") {
      // Remove the request from the user's requests
      await change.after.ref.delete();
      return;
    }
  });

export const onCollaborationRequestCreated = firestore
  .document("collaboratorRequests/{collabId}")
  .onCreate(async (snapshot) => {
    const data = snapshot.data();
    const scheduleName = data.name;
    const recipientEmail = data.email;

    if (!scheduleName || !recipientEmail) {
      throw new Error("Missing schedule name or recipient email");
    }

    // This will be used to send emails
    const apiInstance = new TransactionalEmailsApi();

    // This is the API key used to send emails
    apiInstance.setApiKey(
      TransactionalEmailsApiApiKeys.apiKey,
      process.env.SENDINBLUE_API_KEY
    );

    const sendSmtpEmail = new SendSmtpEmail();

    sendSmtpEmail.sender = {
      email: "notifications@schedulify.pro",
      name: "Schedulify",
    };
    sendSmtpEmail.to = [
      {
        email: recipientEmail,
      },
    ];
    sendSmtpEmail.subject = "You have been invited to a schedule on Schedulify";

    sendSmtpEmail.htmlContent = `
    <html>
      <body>
        <h1>You have been invited to a schedule on Schedulify</h1>
        <p>You have been invited to collaborate on the schedule <strong>${scheduleName}</strong> on Schedulify.</p>
        <p>Click <a href="https://app.schedulify.pro">here</a> to login and view the schedule.</p>

        <p>Thanks,</p>
        <p>The Schedulify Team</p>

      </body>
    </html>
  `;

    try {
      await apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (err) {
      console.error(err);
    }
  });
