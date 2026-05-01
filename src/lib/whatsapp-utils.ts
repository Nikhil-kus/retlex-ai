/**
 * Generates a WhatsApp message from cart data in the required format
 */
export function generateWhatsAppMessage(
  shopName: string,
  cartItems: any[],
  totalAmount: number
): string {
  let message = `🏪 ${shopName}\n`;
  message += `Items:\n`;

  // Add each item on a new line
  cartItems.forEach((item) => {
    const unit = item.unit || item.baseUnit || 'pc';
    const itemTotal = item.itemTotal || 0;
    message += `${item.name} (${item.quantity} ${unit}) - ₹${itemTotal.toFixed(2)}\n`;
  });

  message += `Total Amount: ₹${totalAmount.toFixed(2)}\n`;
  message += `Status: ✅ Paid\n`;
  message += `🙏 Thank you for shopping with us!\n`;
  message += `Visit again 😊`;

  return message;
}

/**
 * Opens WhatsApp with pre-filled message
 */
export function openWhatsAppChat(phoneNumber: string, message: string): void {
  if (!phoneNumber) {
    console.warn('Phone number not provided');
    return;
  }

  // Remove any non-digit characters from phone number
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Ensure phone number starts with country code (default to 91 for India)
  // If it's a 10-digit number, it's a local Indian number, so unconditionally prepend 91.
  const formattedPhone = cleanPhone.length === 10 
    ? `91${cleanPhone}` 
    : (cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`);

  // Encode the message
  const encodedMessage = encodeURIComponent(message);

  // Open WhatsApp
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
}
