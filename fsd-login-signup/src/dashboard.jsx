import React, { useState } from "react";

const Dashboard = () => {
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user"));

  // ✅ FIXED BY LAKHAN SINGH: Protect route
  if (!token) {
    window.location.href = "/";
    return null;
  }

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");

  // ✅ FIXED BY LAKHAN SINGH: Using LOCAL images from public folder
  const categories = [
    {
      title: "Cleaning Services",
      services: [
        { name: "Bathroom Cleaning", img: "/images/bathroom.jpg" },
        { name: "Sofa Cleaning", img: "/images/sofa.jpg" },
        { name: "Kitchen Cleaning", img: "/images/kitchen.jpg" }
      ]
    },
    {
      title: "Painting Services",
      services: [
        { name: "Interior Painting", img: "/images/painting.jpg" },
        { name: "Exterior Painting", img: "/images/painting.jpg" }
      ]
    },
    {
      title: "Pest Control",
      services: [
        { name: "Cockroach Control", img: "/images/pest.jpg" },
        { name: "Termite Control", img: "/images/pest.jpg" }
      ]
    }
  ];

  const handleBooking = (service) => {
    alert(`✅ ${service} booked at ${location || "your location"}`);
  };

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      fontFamily: "Arial"
    }}>

      {/* 🔥 NAVBAR */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "15px 40px",
        background: "#111",
        color: "#fff",
        alignItems: "center"
      }}>
        <h2>🏠 Home Services</h2>

        <div style={{ display: "flex", gap: "20px" }}>
          <span>Home</span>
          <span>Profile</span>
          <span>Settings</span>
          <span>About</span>
        </div>

        <div>
          👤 {user?.username}
          <button
            style={{
              marginLeft: "10px",
              padding: "6px 12px",
              background: "#ff4d4f",
              border: "none",
              color: "#fff",
              borderRadius: "5px"
            }}
            onClick={() => {
              localStorage.clear();
              window.location.href = "/";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* 🔥 HERO */}
      <div style={{
        background: "#7bb6cc",
        padding: "60px 20px",
        textAlign: "center"
      }}>
        <h1>The Award Winning Company</h1>

        <div style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          flexWrap: "wrap"
        }}>
          <input
            placeholder="📍 Enter Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px" }}
          />

          <input
            placeholder="Search Services"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px" }}
          />
        </div>
      </div>

      {/* 🔥 SERVICES */}
      <div style={{ padding: "40px" }}>
        {categories.map((category, index) => (
          <div key={index} style={{ marginBottom: "40px" }}>
            <h2>{category.title}</h2>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "20px"
            }}>
              {category.services
                .filter(s =>
                  s.name.toLowerCase().includes(search.toLowerCase())
                )
                .map((service, i) => (
                  <div key={i} style={{
                    background: "#fff",
                    borderRadius: "10px",
                    overflow: "hidden",
                    boxShadow: "0 5px 15px rgba(0,0,0,0.1)"
                  }}>
                    <img
                      src={service.img}
                      alt={service.name}
                      style={{
                        width: "100%",
                        height: "180px",
                        objectFit: "cover"
                      }}
                    />

                    <div style={{ padding: "15px", textAlign: "center" }}>
                      <h4>{service.name}</h4>

                      <button
                        style={{
                          marginTop: "10px",
                          padding: "10px",
                          background: "#667eea",
                          border: "none",
                          color: "#fff",
                          borderRadius: "5px"
                        }}
                        onClick={() => handleBooking(service.name)}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Dashboard;