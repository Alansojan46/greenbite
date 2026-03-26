import Notification from "../models/Notification.js";
import User from "../models/User.js";

const formatClaimText = ({ servings, units, kg }) => {
  if (servings != null) return `${servings} servings`;
  if (units != null) return `${units} units`;
  if (kg != null) return `${kg} kg`;
  return "a portion";
};

const formatRemainingText = ({ remainingServings, remainingUnits, remainingKg }) => {
  if (remainingServings != null) return `${remainingServings} servings remaining`;
  if (remainingUnits != null) return `${remainingUnits} units remaining`;
  if (remainingKg != null) return `${remainingKg} kg remaining`;
  return "";
};

export const notifyDonationClaimed = async ({ donor, claimer, donation, claim }) => {
  const claimerName = claimer?.name || claimer?.email || "A user";
  const claimText = claim ? formatClaimText(claim) : "the donation";
  const remainingText = claim ? formatRemainingText(claim) : "";
  const suffix = remainingText ? ` (${remainingText})` : "";
  await Notification.create({
    userId: donor._id,
    type: "donation_claimed",
    donationId: donation._id,
    claimerId: claimer?._id,
    message: `${claimerName} claimed ${claimText} from your donation "${donation.foodName}".${suffix}`,
  });
  console.log("Donation claimed notification", {
    donorEmail: donor.email,
    claimerEmail: claimer?.email,
    donationId: donation._id.toString(),
  });
};

const formatDonationQuantity = (donation) => {
  const servings = donation?.estimatedPeopleServed ?? donation?.remainingPeopleServed;
  const kg = donation?.quantityKg ?? donation?.remainingKg;
  const units = donation?.quantityUnits ?? donation?.remainingUnits;

  if (servings != null && Number(servings) > 0) return `${Number(servings)} servings`;
  if (kg != null && Number(kg) > 0) return `${Number(kg)} kg`;
  if (units != null && Number(units) > 0) return `${Number(units)} units`;
  return "";
};

export const notifyDonationPosted = async ({ donor, donation }) => {
  const donorId = donor?._id;
  if (!donation?._id) return;

  const recipients = await User.find({
    role: { $in: ["regular", "ngo"] },
    ...(donorId ? { _id: { $ne: donorId } } : {}),
  }).select("_id role");

  if (!recipients.length) return;

  const qty = formatDonationQuantity(donation);
  const qtyText = qty ? ` (${qty})` : "";
  const message = `New donation posted: "${donation.foodName}".${qtyText}`;

  await Notification.insertMany(
    recipients.map((u) => ({
      userId: u._id,
      type: "donation_posted",
      donationId: donation._id,
      message,
    })),
    { ordered: false }
  );
};

export const notifyDonationExpired = async ({ donorId, donation }) => {
  if (!donorId || !donation?._id) return;

  const message = `Your donation "${donation.foodName}" has expired and is no longer available.`;

  // Idempotent: avoids duplicate notifications across refreshes and race conditions.
  await Notification.updateOne(
    { userId: donorId, type: "donation_expired", donationId: donation._id },
    {
      $setOnInsert: {
        userId: donorId,
        type: "donation_expired",
        donationId: donation._id,
        message,
        read: false,
      },
    },
    { upsert: true }
  );
};
