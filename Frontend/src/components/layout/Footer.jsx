import React, { useState } from "react";
import { Instagram, Linkedin, Github, Dribbble, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../lib/api";

function Footer() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setMessage("Subscribed successfully!");
        setEmail("");
      } else {
        setMessage("Failed to subscribe. Try again.");
      }
    } catch (err) {
      setMessage("An error occurred. Please try again.");
    }
  };

  return (
    <footer className="text-indigo-900 pt-12 px-6 bg-white/20">
      <div className="flex flex-col md:flex-row justify-between gap-12 items-start p-10">
        {/* Newsletter Column */}
        <div className="w-full md:w-1/3">
          <h3 className="text-2xl sm:text-3xl font-semibold mb-6">
            Subscribe to our newsletter to <br /> stay in touch with the latest.
          </h3>
          <div className="relative w-full">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full px-6 py-3 pr-14 text-sm text-indigo-900 bg-transparent border border-gray-400 rounded-full outline-none placeholder:text-gray-500"
            />
            <button
              onClick={handleSubscribe}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white bg-indigo-600 p-2 rounded-full hover:bg-indigo-700 transition"
            >
              <Mail size={18} />
            </button>
          </div>

          {message && (
            <p className="mt-4 text-sm text-indigo-700 font-medium">
              {message}
            </p>
          )}

          <p className="mt-8 mb-4 text-sm tracking-widest text-gray-500 font-medium">
            FOLLOW US HERE:
          </p>

          <div className="flex items-center gap-4">
            {[Instagram, Linkedin, Github].map((Icon, i) => (
              <span
                key={i}
                className="w-10 h-10 border border-gray-400 rounded-full flex items-center justify-center text-indigo-900 hover:bg-indigo-600 hover:text-white transition"
              >
                <Icon size={20} />
              </span>
            ))}
          </div>
        </div>

        {/* Links Column */}
        <div className="w-full md:w-1/3">
          <div className="grid gap-3">
            {[
              "Our Services",
              "Projects",
              "Dedicated team",
              "Open Source",
              "Referral Program",
              "Contacts",
              "Blog",
            ].map((item, i) => (
              <Link
                key={i}
                to="/"
                className="text-lg font-medium text-indigo-900 hover:text-indigo-600 transition"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>

        {/* Contact Column */}
        <div className="w-full md:w-1/3">
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-1">DROP US A LINE</p>
            <p className="text-lg font-semibold text-indigo-900">
              hackzen.dev@gmail.com
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">CALL US</p>
            <div className="flex items-center gap-2">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                alt="WhatsApp"
                className="w-5 h-5"
              />
              <p className="text-lg font-semibold text-indigo-900">
                +1 (000) 337-8573
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-center border-y-2 py-4 border-indigo-100 text-lg font-semibold text-indigo-900">
          © HackZen. All rights reserved
        </p>
      </div>
    </footer>
  );
}

export default Footer;
