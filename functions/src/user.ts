import {firestore as firestoreAdmin} from "firebase-admin";
import {firestore} from "firebase-functions/v1";

export const onUserDocumentChanged = firestore
  .document("users/{uid}")
  .onUpdate(async (change, context) => {
    const {uid} = context.params;
    const afterName = change.after.get("displayName");
    const beforeName = change.before.get("displayName");

    if (afterName === beforeName) {
      return;
    }

    // Add the user to the collaborators
    const schedules = await firestoreAdmin()
      .collection("schedules")
      .where(`collaborators`, "array-contains", uid)
      .get();

    if (schedules.empty) {
      return;
    }

    const batch = firestoreAdmin().batch();

    schedules.forEach(scheduleDoc => {
      batch.update(
        firestoreAdmin().collection("scheduleMembership").doc(scheduleDoc.id),
        {
          [`collaborators.${uid}.name`]: afterName,
        },
      );
    });

    await batch.commit();
  });
