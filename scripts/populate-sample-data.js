const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateSampleData() {
  console.log('🌱 Starting to populate sample data...');

  try {
    // Create sample users
    console.log('Creating sample users...');
    const users = await Promise.all([
      prisma.user.create({
        data: {
          email: 'john.doe@example.com',
          name: 'John Doe',
          userId: 'USER001',
          phone: '+91-9876543210',
          address: '123 Main Street, Mumbai, Maharashtra',
          role: 'USER',
          remainingQuota: 8,
          emailVerified: new Date(),
        }
      }),
      prisma.user.create({
        data: {
          email: 'sarah.wilson@example.com',
          name: 'Sarah Wilson',
          userId: 'USER002',
          phone: '+91-9876543211',
          address: '456 Park Avenue, Delhi, Delhi',
          role: 'USER',
          remainingQuota: 6,
          emailVerified: new Date(),
        }
      }),
      prisma.user.create({
        data: {
          email: 'mike.johnson@example.com',
          name: 'Mike Johnson',
          userId: 'USER003',
          phone: '+91-9876543212',
          address: '789 Oak Road, Bangalore, Karnataka',
          role: 'USER',
          remainingQuota: 10,
          emailVerified: new Date(),
        }
      }),
      prisma.user.create({
        data: {
          email: 'emily.brown@example.com',
          name: 'Emily Brown',
          userId: 'USER004',
          phone: '+91-9876543213',
          address: '321 Pine Street, Chennai, Tamil Nadu',
          role: 'USER',
          remainingQuota: 4,
          emailVerified: new Date(),
        }
      }),
      prisma.user.create({
        data: {
          email: 'david.lee@example.com',
          name: 'David Lee',
          userId: 'USER005',
          phone: '+91-9876543214',
          address: '654 Elm Avenue, Hyderabad, Telangana',
          role: 'USER',
          remainingQuota: 12,
          emailVerified: new Date(),
        }
      })
    ]);

    console.log(`✅ Created ${users.length} users`);

    // Create delivery partners
    console.log('Creating delivery partners...');
    const partners = await Promise.all([
      prisma.deliveryPartner.create({
        data: {
          name: 'Fast Delivery Services',
          phone: '+91-9876543220',
          email: 'fast@delivery.com',
          vehicleNumber: 'MH01AB1234',
          serviceArea: 'Mumbai',
          capacityPerDay: 25,
          isActive: true,
        }
      }),
      prisma.deliveryPartner.create({
        data: {
          name: 'Quick Gas Delivery',
          phone: '+91-9876543221',
          email: 'quick@delivery.com',
          vehicleNumber: 'DL02CD5678',
          serviceArea: 'Delhi',
          capacityPerDay: 30,
          isActive: true,
        }
      }),
      prisma.deliveryPartner.create({
        data: {
          name: 'Reliable Transport',
          phone: '+91-9876543222',
          email: 'reliable@delivery.com',
          vehicleNumber: 'KA03EF9012',
          serviceArea: 'Bangalore',
          capacityPerDay: 20,
          isActive: true,
        }
      })
    ]);

    console.log(`✅ Created ${partners.length} delivery partners`);

    // Create cylinder stock
    console.log('Creating cylinder stock...');
    const stock = await prisma.cylinderStock.upsert({
      where: { id: 'default' },
      update: { totalAvailable: 2500 },
      create: { id: 'default', totalAvailable: 2500 }
    });

    console.log(`✅ Created cylinder stock with ${stock.totalAvailable} cylinders`);

    // Create cylinder batches
    console.log('Creating cylinder batches...');
    const batches = await Promise.all([
      prisma.cylinderBatch.create({
        data: {
          supplier: 'Gas Supply Co.',
          invoiceNo: 'INV001',
          quantity: 500,
          receivedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          status: 'ACTIVE',
          notes: 'Monthly supply batch'
        }
      }),
      prisma.cylinderBatch.create({
        data: {
          supplier: 'Energy Solutions Ltd.',
          invoiceNo: 'INV002',
          quantity: 300,
          receivedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          status: 'ACTIVE',
          notes: 'Additional supply'
        }
      })
    ]);

    console.log(`✅ Created ${batches.length} cylinder batches`);

    // Create sample bookings with different statuses
    console.log('Creating sample bookings...');
    const now = new Date();
    const bookings = await Promise.all([
      // Pending bookings
      prisma.booking.create({
        data: {
          userId: users[0].id,
          userName: users[0].name,
          userEmail: users[0].email,
          userPhone: users[0].phone,
          userAddress: users[0].address,
          paymentMethod: 'UPI',
          quantity: 2,
          status: 'PENDING',
          requestedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          notes: 'Urgent delivery needed'
        }
      }),
      prisma.booking.create({
        data: {
          userId: users[1].id,
          userName: users[1].name,
          userEmail: users[1].email,
          userPhone: users[1].phone,
          userAddress: users[1].address,
          paymentMethod: 'COD',
          quantity: 1,
          status: 'PENDING',
          requestedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
        }
      }),
      // Approved bookings
      prisma.booking.create({
        data: {
          userId: users[2].id,
          userName: users[2].name,
          userEmail: users[2].email,
          userPhone: users[2].phone,
          userAddress: users[2].address,
          paymentMethod: 'UPI',
          quantity: 3,
          status: 'APPROVED',
          requestedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
          expectedDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        }
      }),
      // Out for delivery
      prisma.booking.create({
        data: {
          userId: users[3].id,
          userName: users[3].name,
          userEmail: users[3].email,
          userPhone: users[3].phone,
          userAddress: users[3].address,
          paymentMethod: 'COD',
          quantity: 2,
          status: 'OUT_FOR_DELIVERY',
          requestedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 2 days ago
          expectedDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day from now
        }
      }),
      // Delivered bookings
      prisma.booking.create({
        data: {
          userId: users[4].id,
          userName: users[4].name,
          userEmail: users[4].email,
          userPhone: users[4].phone,
          userAddress: users[4].address,
          paymentMethod: 'UPI',
          quantity: 1,
          status: 'DELIVERED',
          requestedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 3 days ago
          deliveredAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
        }
      }),
      // More delivered bookings for revenue
      prisma.booking.create({
        data: {
          userId: users[0].id,
          userName: users[0].name,
          userEmail: users[0].email,
          userPhone: users[0].phone,
          userAddress: users[0].address,
          paymentMethod: 'UPI',
          quantity: 2,
          status: 'DELIVERED',
          requestedAt: new Date(now.getTime() - 96 * 60 * 60 * 1000), // 4 days ago
          deliveredAt: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 2 days ago
        }
      }),
      prisma.booking.create({
        data: {
          userId: users[1].id,
          userName: users[1].name,
          userEmail: users[1].email,
          userPhone: users[1].phone,
          userAddress: users[1].address,
          paymentMethod: 'COD',
          quantity: 1,
          status: 'DELIVERED',
          requestedAt: new Date(now.getTime() - 120 * 60 * 60 * 1000), // 5 days ago
          deliveredAt: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 3 days ago
        }
      })
    ]);

    console.log(`✅ Created ${bookings.length} bookings`);

    // Create payments for bookings
    console.log('Creating payments...');
    const payments = await Promise.all([
      // Pending UPI payment
      prisma.payment.create({
        data: {
          bookingId: bookings[0].id,
          amount: 2200, // 2 cylinders * 1100
          method: 'UPI',
          status: 'PENDING',
          upiTxnId: 'TXN123456789',
        }
      }),
      // Pending COD payment
      prisma.payment.create({
        data: {
          bookingId: bookings[1].id,
          amount: 1100, // 1 cylinder * 1100
          method: 'COD',
          status: 'PENDING',
        }
      }),
      // Successful UPI payment
      prisma.payment.create({
        data: {
          bookingId: bookings[2].id,
          amount: 3300, // 3 cylinders * 1100
          method: 'UPI',
          status: 'SUCCESS',
          upiTxnId: 'TXN987654321',
        }
      }),
      // Pending COD payment
      prisma.payment.create({
        data: {
          bookingId: bookings[3].id,
          amount: 2200, // 2 cylinders * 1100
          method: 'COD',
          status: 'PENDING',
        }
      }),
      // Successful UPI payment
      prisma.payment.create({
        data: {
          bookingId: bookings[4].id,
          amount: 1100, // 1 cylinder * 1100
          method: 'UPI',
          status: 'SUCCESS',
          upiTxnId: 'TXN456789123',
        }
      }),
      // Successful UPI payment
      prisma.payment.create({
        data: {
          bookingId: bookings[5].id,
          amount: 2200, // 2 cylinders * 1100
          method: 'UPI',
          status: 'SUCCESS',
          upiTxnId: 'TXN789123456',
        }
      }),
      // Successful COD payment
      prisma.payment.create({
        data: {
          bookingId: bookings[6].id,
          amount: 1100, // 1 cylinder * 1100
          method: 'COD',
          status: 'SUCCESS',
        }
      })
    ]);

    console.log(`✅ Created ${payments.length} payments`);

    // Create delivery assignments
    console.log('Creating delivery assignments...');
    const assignments = await Promise.all([
      prisma.deliveryAssignment.create({
        data: {
          bookingId: bookings[3].id, // Out for delivery
          partnerId: partners[0].id,
          status: 'OUT_FOR_DELIVERY',
          scheduledDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          scheduledTime: '10:00 AM',
          priority: 'high',
          notes: 'Customer requested morning delivery',
        }
      }),
      prisma.deliveryAssignment.create({
        data: {
          bookingId: bookings[2].id, // Approved
          partnerId: partners[1].id,
          status: 'ASSIGNED',
          scheduledDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          scheduledTime: '2:00 PM',
          priority: 'normal',
        }
      })
    ]);

    console.log(`✅ Created ${assignments.length} delivery assignments`);

    // Create booking events
    console.log('Creating booking events...');
    const events = await Promise.all([
      prisma.bookingEvent.create({
        data: {
          bookingId: bookings[0].id,
          status: 'PENDING',
          title: 'Booking Created',
          description: 'New booking created by user',
        }
      }),
      prisma.bookingEvent.create({
        data: {
          bookingId: bookings[2].id,
          status: 'APPROVED',
          title: 'Booking Approved',
          description: 'Booking approved by admin',
        }
      }),
      prisma.bookingEvent.create({
        data: {
          bookingId: bookings[3].id,
          status: 'OUT_FOR_DELIVERY',
          title: 'Out for Delivery',
          description: 'Order assigned to delivery partner',
        }
      }),
      prisma.bookingEvent.create({
        data: {
          bookingId: bookings[4].id,
          status: 'DELIVERED',
          title: 'Delivered',
          description: 'Order delivered successfully',
        }
      })
    ]);

    console.log(`✅ Created ${events.length} booking events`);

    // Create contact messages
    console.log('Creating contact messages...');
    const contacts = await Promise.all([
      prisma.contactMessage.create({
        data: {
          userId: users[0].id,
          subject: 'Delivery Status Inquiry',
          message: 'I would like to know the status of my recent booking.',
          category: 'Delivery',
          priority: 'Medium',
          status: 'NEW',
        }
      }),
      prisma.contactMessage.create({
        data: {
          userId: users[1].id,
          subject: 'Payment Issue',
          message: 'I am having trouble with the UPI payment.',
          category: 'Payment',
          priority: 'High',
          status: 'OPEN',
        }
      }),
      prisma.contactMessage.create({
        data: {
          userId: users[2].id,
          subject: 'General Inquiry',
          message: 'What are your delivery timings?',
          category: 'General',
          priority: 'Low',
          status: 'RESOLVED',
        }
      })
    ]);

    console.log(`✅ Created ${contacts.length} contact messages`);

    // Create stock adjustments
    console.log('Creating stock adjustments...');
    const adjustments = await Promise.all([
      prisma.stockAdjustment.create({
        data: {
          stockId: stock.id,
          delta: 500,
          type: 'RECEIVE',
          reason: 'Initial stock from supplier',
          batchId: batches[0].id,
        }
      }),
      prisma.stockAdjustment.create({
        data: {
          stockId: stock.id,
          delta: 300,
          type: 'RECEIVE',
          reason: 'Additional supply',
          batchId: batches[1].id,
        }
      }),
      prisma.stockAdjustment.create({
        data: {
          stockId: stock.id,
          delta: -2,
          type: 'ISSUE',
          reason: 'Booking fulfillment',
          bookingId: bookings[4].id,
        }
      }),
      prisma.stockAdjustment.create({
        data: {
          stockId: stock.id,
          delta: -2,
          type: 'ISSUE',
          reason: 'Booking fulfillment',
          bookingId: bookings[5].id,
        }
      }),
      prisma.stockAdjustment.create({
        data: {
          stockId: stock.id,
          delta: -1,
          type: 'ISSUE',
          reason: 'Booking fulfillment',
          bookingId: bookings[6].id,
        }
      })
    ]);

    console.log(`✅ Created ${adjustments.length} stock adjustments`);

    // Update user quotas based on bookings
    console.log('Updating user quotas...');
    await Promise.all([
      prisma.user.update({
        where: { id: users[0].id },
        data: { remainingQuota: 6 } // 8 - 2
      }),
      prisma.user.update({
        where: { id: users[1].id },
        data: { remainingQuota: 5 } // 6 - 1
      }),
      prisma.user.update({
        where: { id: users[2].id },
        data: { remainingQuota: 7 } // 10 - 3
      }),
      prisma.user.update({
        where: { id: users[3].id },
        data: { remainingQuota: 2 } // 4 - 2
      }),
      prisma.user.update({
        where: { id: users[4].id },
        data: { remainingQuota: 11 } // 12 - 1
      })
    ]);

    console.log('✅ Updated user quotas');

    console.log('🎉 Sample data population completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${users.length} users created`);
    console.log(`- ${partners.length} delivery partners created`);
    console.log(`- ${bookings.length} bookings created`);
    console.log(`- ${payments.length} payments created`);
    console.log(`- ${assignments.length} delivery assignments created`);
    console.log(`- ${contacts.length} contact messages created`);
    console.log(`- ${adjustments.length} stock adjustments created`);
    console.log(`- Stock level: ${stock.totalAvailable} cylinders`);

  } catch (error) {
    console.error('❌ Error populating sample data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  populateSampleData()
    .then(() => {
      console.log('✅ Sample data population completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to populate sample data:', error);
      process.exit(1);
    });
}

module.exports = { populateSampleData };
