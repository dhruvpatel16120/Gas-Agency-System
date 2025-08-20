import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import puppeteer from 'puppeteer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser;
  let page;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Get comprehensive booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        assignment: {
          include: {
            partner: {
              select: {
                name: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    // Simple pricing structure - no GST or delivery charges
    const pricePerCylinder = 1100;
    const subtotal = pricePerCylinder * booking.quantity;
    const total = subtotal;

    // Generate simple, professional PDF invoice
    const invoiceHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${booking.id}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
          }
          
          .invoice-container {
            width: 100%;
            height: 100%;
            padding: 20mm;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          
          .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          
          .company-address {
            font-size: 12px;
            margin-bottom: 5px;
          }
          
          .company-contact {
            font-size: 11px;
            color: #666;
          }
          
          .invoice-title {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
            text-transform: uppercase;
            text-align: center;
          }
          
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          
          .invoice-left, .invoice-right {
            width: 45%;
          }
          
          .invoice-left h3, .invoice-right h3 {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
          }
          
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 11px;
          }
          
          .detail-label {
            font-weight: bold;
            color: #555;
          }
          
          .detail-value {
            color: #333;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
          }
          
          .items-table th {
            background: #f5f5f5;
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
          }
          
          .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            font-size: 11px;
          }
          
          .item-description {
            width: 50%;
          }
          
          .item-quantity {
            width: 15%;
            text-align: center;
          }
          
          .item-price {
            width: 15%;
            text-align: right;
          }
          
          .item-amount {
            width: 20%;
            text-align: right;
          }
          
          .totals-section {
            margin-top: 30px;
            text-align: right;
          }
          
          .total-row {
            margin-bottom: 8px;
            font-size: 12px;
          }
          
          .total-label {
            font-weight: bold;
            margin-right: 20px;
          }
          
          .total-value {
            font-weight: bold;
            min-width: 80px;
            display: inline-block;
          }
          
          .grand-total {
            font-size: 14px;
            font-weight: bold;
            border-top: 2px solid #333;
            padding-top: 8px;
            margin-top: 8px;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 15px;
          }
          
          .status-badge {
            background: #f0f0f0;
            color: #333;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-name">Gas Agency System</div>
            <div class="company-address">123 Main Street, Business District, City 12345</div>
            <div class="company-contact">Phone: +91-1234567890 | Email: billing@gasagency.com</div>
          </div>
          
          <div class="invoice-title">Invoice</div>
          
          <div class="invoice-details">
            <div class="invoice-left">
              <h3>Bill To</h3>
              <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${booking.userName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Address:</span>
                <span class="detail-value">${booking.userAddress}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Phone:</span>
                <span class="detail-value">${booking.userPhone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${booking.userEmail}</span>
              </div>
            </div>
            
            <div class="invoice-right">
              <h3>Invoice Details</h3>
              <div class="detail-row">
                <span class="detail-label">Invoice #:</span>
                <span class="detail-value">INV-${booking.id.slice(-8).toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${new Date().toLocaleDateString('en-IN')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Due Date:</span>
                <span class="detail-value">${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-IN')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value"><span class="status-badge">${booking.status.replace('_', ' ')}</span></span>
              </div>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th class="item-description">Description</th>
                <th class="item-quantity">Qty</th>
                <th class="item-price">Unit Price</th>
                <th class="item-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="item-description">Gas Cylinder (14.2 kg)</td>
                <td class="item-quantity">${booking.quantity}</td>
                <td class="item-price">₹${pricePerCylinder.toLocaleString('en-IN')}</td>
                <td class="item-amount">₹${subtotal.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="totals-section">
            <div class="total-row">
              <span class="total-label">Total Amount:</span>
              <span class="total-value grand-total">₹${total.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice and does not require a physical signature.</p>
            <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Launch browser with minimal configuration for stability
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-web-security'
      ]
    });

    // Create new page
    page = await browser.newPage();
    
    // Set viewport to A4 size
    await page.setViewport({ width: 794, height: 1123 }); // A4 dimensions in pixels
    
    // Set content and wait for it to load
    await page.setContent(invoiceHtml, { 
      waitUntil: 'domcontentloaded' 
    });

    // Simple wait for rendering
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if page is still valid
    if (!page || page.isClosed()) {
      throw new Error('Page is closed or invalid');
    }
    
    console.log('Page content loaded, generating PDF...');

    // Generate PDF with A4 size and no margins
    console.log('Starting PDF generation...');
    let pdfBuffer;
    try {
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        }
      });
      console.log('PDF generated successfully, size:', pdfBuffer.length);
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      throw new Error(`PDF generation failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
    }

    // Set proper headers for PDF download
    const response = new NextResponse(pdfBuffer);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="invoice-${booking.id.slice(-8).toUpperCase()}.pdf"`);
    response.headers.set('Content-Length', pdfBuffer.length.toString());
    
    return response;

  } catch (error) {
    console.error('Failed to generate PDF invoice:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { success: false, message: 'Failed to generate invoice PDF' },
      { status: 500 }
    );
  } finally {
    // Proper cleanup with error handling
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('Error closing page:', e);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
  }
}