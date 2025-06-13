const { db } = require("../firebaseAdmin");
const { collection, query, where, getDocs } = require("firebase/firestore");

// Book Appointment
const bookAppointment = async (req, res) => {
  try {
    const {
      teacherEmail,
      subject,
      message,
      date,
      slot,
      studentEmail,
      studentUsername,
    } = req.body;

    if (!teacherEmail) {
      return res.status(400).json({ message: "Teacher email is required" });
    }

    // Check if slot is already booked
    const existingAppointmentQuery = db.collection("appointments")
      .where("teacherEmail", "==", teacherEmail)
      .where("date", "==", date)
      .where("slot", "==", slot)
      .where("status", "in", ["pending", "approved"]);

    const existingSnap = await existingAppointmentQuery.get();

    if (!existingSnap.empty) {
      return res.status(409).json({ message: "This time slot is already booked." });
    }

    // Get teacher details
    const teacherQuery = db.collection("users")
      .where("email", "==", teacherEmail)
      .where("role", "==", "teacher");

    const teacherSnap = await teacherQuery.get();

    if (teacherSnap.empty) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const teacherDoc = teacherSnap.docs[0];
    const teacherData = teacherDoc.data();

    const appointment = {
      teacherEmail,
      teacherName: teacherData.username || teacherData.name || "Unknown",
      studentEmail,
      studentUsername,
      subject,
      message,
      date,
      slot,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("appointments").add(appointment);

    // ✅ Return the ID
    res.status(200).json({ message: "Appointment booked successfully", id: docRef.id });
  } catch (err) {
    console.error("Error booking appointment:", err);
    res.status(500).json({ message: "Failed to book appointment" });
  }
};





// Using Firebase Admin SDK
const getAppointmentsByStudent = async (req, res) => {
  const email = req.params.email; // Use route param

  if (!email) {
    return res.status(400).json({ message: "Student email is required" });
  }

  try {
    console.log("Fetching appointments for student:", email);

    const snapshot = await db.collection("appointments")
      .where("studentEmail", "==", email)
      .get();

    const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Return empty array if no appointments
    res.status(200).json(appointments);
  } catch (error) {
    console.error("Error fetching student appointments:", error);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
};




// Get Appointments by Teacher Email
// Get Appointments by Teacher Email
const getAppointmentsByTeacher = async (req, res) => {
  try {
    const teacherEmail = req.params.email;
    if (!teacherEmail) {
      return res.status(400).json({ message: "Teacher email is required" });
    }

    const snapshot = await db.collection("appointments")
      .where("teacherEmail", "==", teacherEmail)
      .get();

    const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Always return an array, even if empty
    return res.status(200).json(appointments);
  } catch (err) {
    console.error("Error fetching teacher appointments:", err);
    return res.status(500).json({ message: "Failed to fetch teacher appointments" });
  }
};





// Get Appointments Between Teacher and Student
const getAllAppointmentsBetween = async (req, res) => {
  try {
    const { teacherEmail, studentEmail } = req.params;

    // Using Admin SDK, query like this:
    const appointmentsRef = db.collection("appointments");
    const snapshot = await appointmentsRef
      .where("teacherEmail", "==", decodeURIComponent(teacherEmail))
      .where("studentEmail", "==", decodeURIComponent(studentEmail))
      .get();

    const appointments = [];
    snapshot.forEach(doc => {
      appointments.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(appointments);
  } catch (err) {
    console.error("Error fetching appointment history:", err);
    res.status(500).json({
      message: "Failed to fetch appointment history",
      error: err.message,
    });
  }
};


// Update Appointment Status
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    const docRef = db.collection("appointments").doc(id);
    // Update status
    await docRef.update({ status });

    // Fetch updated doc to get student username
    const updatedDoc = await docRef.get();
    if (!updatedDoc.exists) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    const appointmentData = updatedDoc.data();
    const studentUsername = appointmentData.studentUsername || null;
    const teacherEmail = appointmentData.teacherEmail || null;
    res.status(200).json({ 
      message: "Appointment status updated", 
      studentUsername: studentUsername ,
      teacherEmail: teacherEmail,
    });
  } catch (err) {
    console.error("Error updating appointment status:", err);
    res.status(500).json({ message: "Failed to update appointment status" });
  }
};



// Delete Appointment
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const docRef = doc(db, "appointments", id);
    await deleteDoc(docRef);

    res.status(200).json({ message: "Appointment deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete appointment" });
  }
};

// Get Teacher by ID
const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = doc(db, "users", id);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.status(200).json({ id: snapshot.id, ...snapshot.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch teacher" });
  }
};

// Get Teacher by Email
const getTeacherByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const q = query(
      collection(db, "users"),
      where("email", "==", email),
      where("role", "==", "teacher")
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const teacher = snapshot.docs[0];
    res.status(200).json({ id: teacher.id, ...teacher.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch teacher by email" });
  }
};


const getAllUsersWithAppointments = async (req, res) => {
  try {
    const usersSnapshot = await db.collection("users").get();

    const usersWithAppointments = await Promise.all(
      usersSnapshot.docs.map(async (doc) => {
        const user = doc.data();
        const email = user.email;

        let appointmentsSnapshot;

        if (user.role === "teacher") {
          appointmentsSnapshot = await db
            .collection("appointments")
            .where("teacherEmail", "==", email)
            .get();
        } else if (user.role === "student") {
          appointmentsSnapshot = await db
            .collection("appointments")
            .where("studentEmail", "==", email)
            .get();
        } else {
          appointmentsSnapshot = { docs: [] }; // if role is unknown
        }

        const appointments = appointmentsSnapshot.docs.map((apptDoc) => ({
          id: apptDoc.id,
          ...apptDoc.data(),
        }));

        return {
          id: doc.id,
          ...user,
          appointments,
        };
      })
    );

    res.status(200).json(usersWithAppointments);
  } catch (err) {
    console.error("Error fetching users with appointments:", err);
    res.status(500).json({ message: "Failed to fetch users and appointments" });
  }
};

module.exports = {
  bookAppointment,
  getAppointmentsByStudent,
  getAppointmentsByTeacher,
  getAllAppointmentsBetween,
  updateAppointmentStatus,
  deleteAppointment,
  getTeacherById,
  getTeacherByEmail,
  getAllUsersWithAppointments
};
