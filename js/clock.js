function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('clock').textContent = `${hh}:${mm}`;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('date').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

updateClock();
setInterval(updateClock, 1000);

// This function is what enables the clock to update and function properly.
// It can be edited if you want to change the format of the clock or date, 
// but it is not recommended to change it unless you know what you are doing.
// Breaking this function will cause the clock to stop working and will require
// grabbing a clean copy of clock.js from the repository and replacing the broken
// one with it.