let userId = new URLSearchParams(window.location.search).get("id");
let originalData = {};

document.addEventListener("DOMContentLoaded", () => {
  loadUser();

  document.getElementById("btnUpdate").addEventListener("click", updateUser);
  document.getElementById("btnDelete").addEventListener("click", deleteUser);

  // Xem trước ảnh khi chọn file
  document.getElementById("avatarInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      document.getElementById("avatarPreview").src = URL.createObjectURL(file);
    }
  });
});

async function loadUser() {
  try {
    const res = await fetch(`${apiBase}/users/${userId}/`, {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    });

    if (!res.ok) throw new Error(`Lỗi load user: ${res.status}`);
    const user = await res.json();

    // Gán dữ liệu vào form
    document.getElementById("username").value = user.username || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("first_name").value = user.first_name || "";
    document.getElementById("last_name").value = user.last_name || "";
    document.getElementById("role").value = user.role || 3;
    document.getElementById("avatarPreview").src = user.avatar 
        ? (user.avatar.startsWith("http") 
            ? user.avatar 
            : `${cloudinaryBase}/` + user.avatar)
        : "";

    // Lưu dữ liệu gốc để so sánh khi update
    originalData = { ...user};
  } catch (err) {
    console.error("Lỗi khi load user:", err);
  }
}

async function updateUser() {
  let updatedData = {
    username: document.getElementById("username").value,
    email: document.getElementById("email").value,
    first_name: document.getElementById("first_name").value,
    last_name: document.getElementById("last_name").value,
    role: parseInt(document.getElementById("role").value),
  };

  // So sánh với dữ liệu gốc
  let isChanged = Object.keys(updatedData).some(key => updatedData[key] && updatedData[key] !== originalData[key]);

  let avatarFile = document.getElementById("avatarInput").files[0];
  if (avatarFile) isChanged = true;

  if (!isChanged) {
    alert("Thông tin người dùng không thay đổi");
    return;
  }

  try {
    let formData = new FormData();
    Object.keys(updatedData).forEach(key => {
      if (updatedData[key]) formData.append(key, updatedData[key]);
    });
    if (avatarFile) formData.append("avatar", avatarFile);

    const res = await fetch(`${apiBase}/users/${userId}/`, {
      method: "PATCH",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: formData
    });

    if (!res.ok) throw new Error(`Cập nhật thất bại (${res.status})`);
    alert("Cập nhật người dùng thành công!", );
    loadUser();
  } catch (err) {
    console.error("Lỗi khi cập nhật:", err);
    alert("Cập nhật thất bại!");
  }
}

async function deleteUser() {
  if (!confirm("Bạn có chắc chắn muốn xóa người dùng này không?")) return;

  try {
    const token = localStorage.getItem("access_token");

    // Lấy thông tin người dùng hiện tại (người đăng nhập)
    const currentRes = await fetch(`${apiBase}/users/current_user/`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const currentUser = (await currentRes.json()).data;

    // Gửi yêu cầu xoá
    const res = await fetch(`${apiBase}/users/${userId}/`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error(`Xóa thất bại (${res.status})`);

    alert("Xóa người dùng thành công!");

    if (currentUser.id === parseInt(userId)) {
      // Tự xóa chính mình
      localStorage.removeItem("access_token");
      window.location.href = "login.html";
    } else {
      // Admin xóa người khác
      window.location.href = "user-management.html";
    }
  } catch (err) {
    console.error("Lỗi khi xóa:", err);
    alert("Xóa người dùng thất bại!");
  }
}

