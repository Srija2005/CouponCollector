const API_URL = "http://localhost:5000";


// ======================================
// ADMIN LOGIN
// ======================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const username =
            document.getElementById("username").value;

        const password =
            document.getElementById("password").value;


        const response = await fetch(`${API_URL}/login`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username,
                password
            })
        });


        const data = await response.json();


        if (response.ok) {

            localStorage.setItem("adminToken", data.token);

            alert("Login successful!");

            window.location.href = "add-coupon.html";

        } else {

            document.getElementById("loginMessage").innerText =
                data.message;
        }

    });
}



// ======================================
// CHECK ADMIN LOGIN
// ======================================

function checkAdmin() {

    const token = localStorage.getItem("adminToken");

    if (!token) {

        alert("Please login as admin first.");

        window.location.href = "login.html";

        return false;
    }

    return true;
}



// ======================================
// ADD COUPON
// ======================================

const couponForm = document.getElementById("couponForm");

if (couponForm) {

    if (!checkAdmin()) {
        // Stop if user is not admin
    }

    couponForm.addEventListener("submit", async function (event) {

        event.preventDefault();


        const code =
            document.getElementById("code").value;

        const discount =
            document.getElementById("discount").value;

        const expiryDate =
            document.getElementById("expiryDate").value;


        const token =
            localStorage.getItem("adminToken");


        const response = await fetch(`${API_URL}/coupons`, {

            method: "POST",

            headers: {

                "Content-Type": "application/json",

                "Authorization": `Bearer ${token}`
            },

            body: JSON.stringify({

                code,
                discount,
                expiryDate

            })
        });


        const data = await response.json();


        if (response.ok) {

            document.getElementById("message").innerText =
                "Coupon added successfully!";

            couponForm.reset();

        } else {

            alert(data.message);

        }

    });
}



// ======================================
// SHOW AVAILABLE COUPONS
// ======================================

const couponList =
    document.getElementById("couponList");


if (couponList) {

    loadCoupons();

}


async function loadCoupons() {

    const response =
        await fetch(`${API_URL}/coupons`);


    const coupons =
        await response.json();


    couponList.innerHTML = "";


    if (coupons.length === 0) {

        couponList.innerHTML =
            "<p>No coupons available.</p>";

        return;
    }


    coupons.forEach(coupon => {

        const couponDiv =
            document.createElement("div");


        couponDiv.className = "coupon-card";


        couponDiv.innerHTML = `

            <h2>${coupon.code}</h2>

            <p>
                Discount:
                <strong>${coupon.discount}%</strong>
            </p>

            <p>
                Expiry Date:
                ${coupon.expiryDate}
            </p>

            <div class="actions">

                <button
                    onclick="editCoupon('${coupon._id}')"
                    class="edit-button">
                    Edit
                </button>

                <button
                    onclick="deleteCoupon('${coupon._id}')"
                    class="delete-button">
                    Delete
                </button>

            </div>

        `;


        couponList.appendChild(couponDiv);

    });

}



// ======================================
// EDIT COUPON
// ======================================

function editCoupon(id) {

    if (!checkAdmin()) {
        return;
    }


    window.location.href =
        `edit-coupon.html?id=${id}`;

}



// ======================================
// LOAD COUPON INTO EDIT PAGE
// ======================================

const editForm =
    document.getElementById("editForm");


if (editForm) {

    if (!checkAdmin()) {
        // Stop
    }


    const params =
        new URLSearchParams(window.location.search);


    const id =
        params.get("id");


    loadCouponForEdit(id);


    editForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const code =
                document.getElementById("editCode").value;


            const discount =
                document.getElementById("editDiscount").value;


            const expiryDate =
                document.getElementById("editExpiryDate").value;


            const token =
                localStorage.getItem("adminToken");


            const response = await fetch(
                `${API_URL}/coupons/${id}`,
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({

                        code,
                        discount,
                        expiryDate

                    })
                }
            );


            const data =
                await response.json();


            if (response.ok) {

                alert(
                    "Coupon updated successfully!"
                );

                window.location.href =
                    "coupons.html";

            } else {

                alert(data.message);

            }

        }
    );

}



async function loadCouponForEdit(id) {

    if (!id) {

        alert("Coupon ID missing");

        window.location.href =
            "coupons.html";

        return;
    }


    const response =
        await fetch(`${API_URL}/coupons/${id}`);


    const coupon =
        await response.json();


    document.getElementById("editCode").value =
        coupon.code;


    document.getElementById("editDiscount").value =
        coupon.discount;


    document.getElementById("editExpiryDate").value =
        coupon.expiryDate;

}



// ======================================
// DELETE COUPON
// ======================================

async function deleteCoupon(id) {

    if (!checkAdmin()) {
        return;
    }


    const confirmDelete =
        confirm(
            "Are you sure you want to delete this coupon?"
        );


    if (!confirmDelete) {
        return;
    }


    const token =
        localStorage.getItem("adminToken");


    const response = await fetch(
        `${API_URL}/coupons/${id}`,
        {

            method: "DELETE",

            headers: {

                "Authorization":
                    `Bearer ${token}`
            }
        }
    );


    const data =
        await response.json();


    if (response.ok) {

        alert("Coupon deleted successfully!");

        loadCoupons();

    } else {

        alert(data.message);

    }

}



// ======================================
// LOGOUT
// ======================================

function logout() {

    localStorage.removeItem("adminToken");

    alert("Logged out successfully.");

    window.location.href =
        "index.html";
}