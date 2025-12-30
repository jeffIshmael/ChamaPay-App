// Utility function to format time remaining
export const formatTimeRemaining = (targetDate: string | Date): string => {
    const now = new Date();
    const target = new Date(targetDate);
    const diffMs = target.getTime() - now.getTime();
  
    // If date has passed
    if (diffMs < 0) {
      return "Overdue";
    }
  
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
  
    // Less than a day - show hours and minutes
    if (diffDays < 1) {
      const hours = diffHours;
      const minutes = diffMinutes % 60;
      
      if (hours === 0) {
        return `${minutes} min${minutes !== 1 ? 's' : ''}`;
      }
      return `${hours} hr${hours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
  
    // Less than a week - show days
    if (diffDays < 7) {
      return `${diffDays} dy${diffDays !== 1 ? 's' : ''}`;
    }
  
    // Less than a month - show weeks and days
    if (diffDays < 30) {
      const weeks = diffWeeks;
      const remainingDays = diffDays % 7;
      
      if (remainingDays === 0) {
        return `${weeks} wk${weeks !== 1 ? 's' : ''}`;
      }
      return `${weeks} wk${weeks !== 1 ? 's' : ''} ${remainingDays} dy${remainingDays !== 1 ? 's' : ''}`;
    }
  
    // More than a month - show months, weeks, and days
    const months = diffMonths;
    const remainingDaysAfterMonths = diffDays % 30;
    const remainingWeeks = Math.floor(remainingDaysAfterMonths / 7);
    const remainingDays = remainingDaysAfterMonths % 7;
  
    let result = `${months} mnth${months !== 1 ? 's' : ''}`;
    
    if (remainingWeeks > 0) {
      result += ` ${remainingWeeks} wk${remainingWeeks !== 1 ? 's' : ''}`;
    }
    
    if (remainingDays > 0) {
      result += ` ${remainingDays} dy${remainingDays !== 1 ? 's' : ''}`;
    }
  
    return result;
  };