const clientId = 'EfyQe0YRgI3naiiqCEpYCECLjqXw3uBNQ8gMu9ic';        
const clientSecret = 'HxSOSz0am9A54UXK8479o0SKzQabjX8jMrsWG2YgUDfOT2lRzHD0tWIuRwFUtOHy5rRYXC4eE3PBVqHndGFWBKQDAndMNMXd7RTyBRVZ02dhspQqdyOyWxKFHyT1wEm6'; // Thay bằng giá trị thật

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      const res = await fetch(`${apiBase}/o/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          username,
          password,
          client_id: clientId,
          client_secret: clientSecret,
        })
      });

      const result = await res.json();
      const message = document.getElementById('message');

      if (res.ok && result.access_token) {
        localStorage.setItem('access_token', result.access_token);
        localStorage.setItem('refresh_token', result.refresh_token);
        localStorage.setItem('token_type', result.token_type);
        message.innerText = "Đăng nhập thành công!";
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        message.innerText = result.error_description || 'Đăng nhập thất bại.';
      }
    });
  }

  if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("username", document.getElementById('username').value);
    formData.append("email", document.getElementById('email').value);
    formData.append("first_name", document.getElementById('first_name').value);
    formData.append("last_name", document.getElementById('last_name').value);
    formData.append("password", document.getElementById('password').value);
    formData.append("role", document.getElementById('role').value);

    // Nếu có input file avatar thì thêm vào
    const avatarInput = document.getElementById('avatar');
    if (avatarInput && avatarInput.files.length > 0) {
      formData.append("avatar", avatarInput.files[0]);
    }

    try {
      const res = await fetch(`${apiBase}/users/`, {
        method: 'POST',
        body: formData   // KHÔNG set Content-Type, để browser tự gắn boundary
      });

      const result = await res.json();
      const message = document.getElementById('message');

      if (res.ok) {
        message.innerText = "Đăng ký thành công! Chuyển sang đăng nhập...";
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
      } else {
        console.error(result);
        message.innerText = result.message || 'Đăng ký thất bại.';
      }
    } catch (err) {
      console.error("Lỗi khi đăng ký:", err);
      document.getElementById('message').innerText = "Có lỗi xảy ra khi đăng ký.";
    }
  });
}

});
