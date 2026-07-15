const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const readline = require("readline");
const prisma = new PrismaClient();

const INDIAN_FIRST_NAMES = [
  "Ramesh", "Suresh", "Amit", "Rahul", "Vikram", "Sunil", "Rajesh", "Vijay", 
  "Anil", "Sanjay", "Manoj", "Dinesh", "Karan", "Arjun", "Deepak", "Pankaj", 
  "Anjali", "Priya", "Deepa", "Sunita", "Anita", "Meena", "Neha", "Pooja", 
  "Kiran", "Shalini", "Ritu", "Swati", "Kavita", "Preeti", "Aarav", "Kabir",
  "Dhruv", "Hrithik", "Jethalal", "Bahubali", "Babita", "Daya"
];

const INDIAN_LAST_NAMES = [
  "Kumar", "Sharma", "Gupta", "Singh", "Mehta", "Verma", "Patil", "Nair", 
  "Prasad", "Yadav", "Joshi", "Trivedi", "Mishra", "Pandey", "Chawla", "Bose", 
  "Roy", "Sen", "Deshmukh", "Kulkarni", "Reddy", "Rao", "Pillai", "Iyer", 
  "Jha", "Pathak", "Dubey", "Shukla", "Bajpai", "Saxena", "Sinha", "Das",
  "Pandey", "Nagar"
];

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", 
  "Kolkata", "Surat", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", 
  "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad"
];

const SUPPORT_SUBJECTS = [
  { subject: "Payment deducted but booking pending", category: "Payment", priority: "high", msg: "I made a payment of Rs. 950 via UPI. The money was debited from my bank, but my booking status still says Pending Payment. Please check." },
  { subject: "Delivery delayed by 3 days", category: "Delivery", priority: "medium", msg: "My booking was approved 3 days ago. The scheduled delivery date was yesterday but I have not received the cylinder yet. Please help." },
  { subject: "Cylinder gas leak sound", category: "Safety", priority: "high", msg: "I just received the cylinder and connected it. There is a slight hissing sound coming from the regulator valve. Is it safe?" },
  { subject: "Address update request", category: "Account", priority: "low", msg: "I have shifted to a new flat in the same building. Can you please update my address from Flat 302 to Flat 504?" },
  { subject: "Extra delivery charges query", category: "Billing", priority: "medium", msg: "The delivery agent asked for Rs. 50 extra for carrying the cylinder to the 3rd floor. Is this official charge?" },
  { subject: "Incorrect cylinder seal", category: "Quality", priority: "medium", msg: "The blue plastic seal on the cylinder cap was loose and partially broken when delivered. I suspect gas pilferage." },
  { subject: "Unable to book online", category: "Technical", priority: "low", msg: "I am trying to book a cylinder but the website is showing a quota exceeded error, even though I have only booked 3 cylinders this year." },
  { subject: "New connection document query", category: "Account", priority: "low", msg: "What documents are required to transfer the gas connection from my father's name to my name?" }
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomPhone() {
  const prefix = getRandomItem(["7", "8", "9"]);
  let rest = "";
  for (let i = 0; i < 9; i++) {
    rest += Math.floor(Math.random() * 10);
  }
  return prefix + rest;
}

function generateRandomAddress(city) {
  const flatNo = getRandomInt(101, 909);
  const wing = getRandomItem(["A", "B", "C", "D", "E"]);
  const apartments = ["Sai Heights", "Galaxy Apartments", "Gokuldham Society", "Shanti Niketan", "Marvel Residency", "Green Valley"];
  const sector = getRandomInt(1, 30);
  const area = getRandomItem(["Vashi", "Andheri", "Kothrud", "Indiranagar", "Salt Lake", "Gachibowli", "Hazratganj"]);
  return `Flat ${flatNo}, ${wing} Wing, ${getRandomItem(apartments)}, Sector ${sector}, ${area}, ${city} - ${getRandomInt(400001, 700099)}`;
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  console.log("\n🌱 Starting Interactive Database Seed (Appending Users only)...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Prompt user for count of users
  const inputCount = await askQuestion("How many users would you like to add? (default: 50): ");
  let countToSeed = 50;
  if (inputCount) {
    const parsed = parseInt(inputCount, 10);
    if (!isNaN(parsed) && parsed > 0) {
      countToSeed = parsed;
    }
  }

  console.log(`\n⚙️  Preparing to seed ${countToSeed} regular users (role: "USER") without affecting existing data...`);

  // Ensure default cylinder stock exists
  let stock = await prisma.cylinderStock.findUnique({ where: { id: "default" } });
  if (!stock) {
    console.log("📦 Creating default cylinder stock record...");
    stock = await prisma.cylinderStock.create({
      data: {
        id: "default",
        totalAvailable: 250
      }
    });
  }

  // Ensure delivery partners exist
  let partners = await prisma.deliveryPartner.findMany({});
  if (partners.length === 0) {
    console.log("🚴 No delivery partners found. Creating default ones...");
    const partnerNames = ["Vijay Yadav", "Sandeep Gupta", "Rahul Singh", "Dinesh Kumar", "Vijay Patil", "Manoj Prasad"];
    for (let i = 0; i < partnerNames.length; i++) {
      const p = await prisma.deliveryPartner.create({
        data: {
          name: partnerNames[i],
          phone: generateRandomPhone(),
          email: `${partnerNames[i].toLowerCase().replace(" ", ".")}@gasagency.com`,
          vehicleNumber: `MH-43-${getRandomItem(["AB", "CD", "EF"])}-${getRandomInt(1000, 9999)}`,
          serviceArea: getRandomItem(["Vashi Area", "Kothrud Sector", "Indiranagar Circle", "Salt Lake Zone"]),
          capacityPerDay: getRandomInt(15, 30),
          isActive: true
        }
      });
      partners.push(p);
    }
  }

  // Get count of existing users to avoid email/userId conflicts
  const existingUsersCount = await prisma.user.count();
  const defaultPasswordHash = await bcrypt.hash("Password@123", 12);

  let usersCreated = 0;
  let bookingsCreated = 0;
  let eventsCreated = 0;
  let paymentsCreated = 0;
  let assignmentsCreated = 0;
  let ticketsCreated = 0;

  console.log(`👤 Seeding ${countToSeed} users and generating transaction logs...`);

  for (let i = 0; i < countToSeed; i++) {
    const uniqueIndex = existingUsersCount + i + 1;
    const firstName = getRandomItem(INDIAN_FIRST_NAMES);
    const lastName = getRandomItem(INDIAN_LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${uniqueIndex}@gmail.com`;
    const userId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}${uniqueIndex}`;
    const city = getRandomItem(INDIAN_CITIES);
    const address = generateRandomAddress(city);
    const phone = generateRandomPhone();
    const remainingQuota = getRandomInt(4, 12);
    const emailVerified = Math.random() > 0.15 ? new Date(Date.now() - getRandomInt(1, 40) * 24 * 60 * 60 * 1000) : null;

    // Create regular user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        userId,
        phone,
        address,
        password: defaultPasswordHash,
        role: "USER",
        remainingQuota,
        emailVerified
      }
    });
    usersCreated++;

    // Randomly decide if they have bookings (70% chance)
    if (Math.random() < 0.70) {
      const numBookings = getRandomInt(1, 2);
      const bookingStatuses = ["DELIVERED", "DELIVERED", "OUT_FOR_DELIVERY", "APPROVED", "PENDING", "CANCELLED"];

      for (let b = 0; b < numBookings; b++) {
        const status = getRandomItem(bookingStatuses);
        const quantity = getRandomInt(1, 2);
        const paymentMethod = getRandomItem(["UPI", "COD"]);
        const isUPI = paymentMethod === "UPI";
        
        const createdAt = new Date(Date.now() - getRandomInt(0, 30) * 24 * 60 * 60 * 1000);
        const updatedAt = new Date(createdAt.getTime() + getRandomInt(1, 8) * 60 * 60 * 1000);

        const booking = await prisma.booking.create({
          data: {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userPhone: user.phone,
            userAddress: user.address,
            paymentMethod,
            quantity,
            receiverName: user.name,
            receiverPhone: user.phone,
            status,
            createdAt,
            updatedAt,
            expectedDate: status !== "PENDING" ? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
            deliveredAt: status === "DELIVERED" ? new Date(createdAt.getTime() + getRandomInt(1, 3) * 24 * 60 * 60 * 1000) : null
          }
        });
        bookingsCreated++;

        // Placed Event
        await prisma.bookingEvent.create({
          data: {
            bookingId: booking.id,
            status: "PENDING",
            title: "Order Placed Successfully",
            description: `Cylinder booking request for ${quantity} cylinder(s) received.`,
            createdAt
          }
        });
        eventsCreated++;

        // Payment status
        let paymentStatus = "PENDING";
        if (status === "DELIVERED" || (isUPI && status !== "CANCELLED")) {
          paymentStatus = "SUCCESS";
        } else if (status === "CANCELLED") {
          paymentStatus = "CANCELLED";
        }

        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: quantity * 950,
            method: paymentMethod,
            status: paymentStatus,
            upiTxnId: isUPI ? `TXN${getRandomInt(1000000000, 9999999999)}` : null,
            createdAt: new Date(createdAt.getTime() + 10 * 60 * 1000)
          }
        });
        paymentsCreated++;

        if (status !== "PENDING" && status !== "CANCELLED") {
          // Approved Event
          await prisma.bookingEvent.create({
            data: {
              bookingId: booking.id,
              status: "APPROVED",
              title: "Booking Approved",
              description: "Your booking is approved. Cylinder allocation completed.",
              createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
            }
          });
          eventsCreated++;

          // Stock Reservation
          const resStatus = status === "DELIVERED" ? "CONSUMED" : "RESERVED";
          await prisma.stockReservation.create({
            data: {
              stockId: "default",
              bookingId: booking.id,
              quantity,
              status: resStatus,
              createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
            }
          });

          // Delivery assignment
          const partner = getRandomItem(partners);
          let assignStatus = "ASSIGNED";
          if (status === "OUT_FOR_DELIVERY") assignStatus = "OUT_FOR_DELIVERY";
          if (status === "DELIVERED") assignStatus = "DELIVERED";

          await prisma.deliveryAssignment.create({
            data: {
              bookingId: booking.id,
              partnerId: partner.id,
              status: assignStatus,
              scheduledDate: new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000),
              scheduledTime: getRandomItem(["10:00 AM - 12:00 PM", "12:00 PM - 02:00 PM", "03:00 PM - 05:00 PM"]),
              notes: "Handle with care.",
              assignedAt: new Date(createdAt.getTime() + 3 * 60 * 60 * 1000)
            }
          });
          assignmentsCreated++;

          if (status === "OUT_FOR_DELIVERY" || status === "DELIVERED") {
            await prisma.bookingEvent.create({
              data: {
                bookingId: booking.id,
                status: "OUT_FOR_DELIVERY",
                title: "Out for Delivery",
                description: `Delivery partner ${partner.name} is on the way.`,
                createdAt: new Date(createdAt.getTime() + 1.5 * 24 * 60 * 60 * 1000)
              }
            });
            eventsCreated++;
          }

          if (status === "DELIVERED") {
            await prisma.bookingEvent.create({
              data: {
                bookingId: booking.id,
                status: "DELIVERED",
                title: "Delivered Successfully",
                description: `Cylinder delivered by ${partner.name}.`,
                createdAt: booking.deliveredAt
              }
            });
            eventsCreated++;

            // Decrement Stock
            await prisma.stockAdjustment.create({
              data: {
                stockId: "default",
                delta: -quantity,
                type: "ISSUE",
                reason: "Cylinder Delivered",
                notes: `Booking Ref: ${booking.id}`,
                bookingId: booking.id
              }
            });

            // Keep track of stock updates
            await prisma.cylinderStock.update({
              where: { id: "default" },
              data: { totalAvailable: { decrement: quantity } }
            });
          }
        }

        if (status === "CANCELLED") {
          await prisma.bookingEvent.create({
            data: {
              bookingId: booking.id,
              status: "CANCELLED",
              title: "Booking Cancelled",
              description: "Order cancelled by customer.",
              createdAt: new Date(createdAt.getTime() + 4 * 60 * 60 * 1000)
            }
          });
          eventsCreated++;
        }
      }
    }

    // Randomly decide if they submit a support ticket (25% chance)
    if (Math.random() < 0.25) {
      const ticketDetails = getRandomItem(SUPPORT_SUBJECTS);
      const ticketStatus = getRandomItem(["NEW", "OPEN", "RESOLVED"]);
      const createdAt = new Date(Date.now() - getRandomInt(1, 15) * 24 * 60 * 60 * 1000);

      const message = await prisma.contactMessage.create({
        data: {
          userId: user.id,
          subject: `${ticketDetails.subject} (#${2000 + uniqueIndex})`,
          message: ticketDetails.msg,
          category: ticketDetails.category,
          priority: ticketDetails.priority,
          phone: user.phone,
          status: ticketStatus,
          createdAt,
          updatedAt: createdAt,
          lastRepliedAt: ticketStatus !== "NEW" ? new Date(createdAt.getTime() + 4 * 60 * 60 * 1000) : null
        }
      });
      ticketsCreated++;

      if (ticketStatus !== "NEW") {
        // Find an admin to reply
        const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
        if (admins.length > 0) {
          const admin = getRandomItem(admins);
          await prisma.contactReply.create({
            data: {
              messageId: message.id,
              authorId: admin.id,
              body: `Hello ${user.name},\n\nWe have received your support request regarding "${ticketDetails.subject}". Our team is verifying this details and will get back to you shortly.\n\nBest Regards,\n${admin.name}`,
              isAdmin: true,
              createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
            }
          });
        }
      }
    }
  }

  console.log("\n🏁 Seeding completed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`👤 Users created:            ${usersCreated}`);
  console.log(`📝 Bookings created:         ${bookingsCreated}`);
  console.log(`📅 Booking events logged:    ${eventsCreated}`);
  console.log(`💳 Payments recorded:        ${paymentsCreated}`);
  console.log(`🚴 Delivery assignments:    ${assignmentsCreated}`);
  console.log(`💬 Support tickets raised:   ${ticketsCreated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
