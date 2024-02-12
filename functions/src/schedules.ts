import {firestore as firestoreAdmin} from "firebase-admin";
import {firestore} from "firebase-functions/v1";

export const onScheduleDeleted = firestore
  .document("schedules/{scheduleId}")
  .onDelete(async (_, context) => {
    // Remove all the requests from the schedule and all the data
    // from the user's requests
    const {scheduleId} = context.params;

    const bulkWriter = firestoreAdmin().bulkWriter();

    const requestsQuery = firestoreAdmin()
      .collection("collaboratorRequests")
      .where("scheduleId", "==", scheduleId);
    const membershipDocRef = firestoreAdmin()
      .collection("scheduleMembership")
      .doc(scheduleId);

    bulkWriter.delete(membershipDocRef);

    const requestsSnap = await requestsQuery.get();

    requestsSnap.forEach(requestDoc => {
      bulkWriter.delete(requestDoc.ref);
    });

    const scheduleDocRef = firestoreAdmin()
      .collection("schedules")
      .doc(scheduleId);

    // Recursively delete all the data from the schedule
    await firestoreAdmin().recursiveDelete(scheduleDocRef, bulkWriter);
  });
