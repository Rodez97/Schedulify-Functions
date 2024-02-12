import {firestore} from "firebase-admin";
import {auth} from "firebase-functions/v1";

export const onDeleted = auth.user().onDelete(async user => {
  const batch = firestore().batch();

  const userDocRef = firestore().collection("users").doc(user.uid);

  batch.delete(userDocRef);

  // Delete all the user's schedules
  const schedules = await firestore()
    .collection("schedules")
    .where("ownerId", "==", user.uid)
    .get();

  if (!schedules.empty) {
    schedules.forEach(scheduleDoc => {
      batch.delete(scheduleDoc.ref);
    });
  }

  // Delete all schedules where the user is a collaborator
  const schedulesWhereCollaborator = await firestore()
    .collection("schedules")
    .where(`collaborators`, "array-contains", user.uid)
    .get();

  if (!schedulesWhereCollaborator.empty) {
    schedulesWhereCollaborator.forEach(scheduleDoc => {
      batch.update(scheduleDoc.ref, {
        collaborators: firestore.FieldValue.arrayRemove(user.uid),
      });

      batch.update(
        firestore().collection("scheduleMembership").doc(scheduleDoc.id),
        {
          [`collaborators.${user.uid}`]: firestore.FieldValue.delete(),
        },
      );
    });
  }

  // Delete all the user's requests
  const requests = await firestore()
    .collection("collaboratorRequests")
    .where("email", "==", user.email)
    .get();

  if (!requests.empty) {
    requests.forEach(requestDoc => {
      batch.delete(requestDoc.ref);
    });
  }

  // Check if the user is a stripe customer
  const customer = await firestore()
    .collection("customers")
    .doc(user.uid)
    .get();

  if (customer.exists) {
    batch.delete(customer.ref);
  }

  return batch.commit();
});
