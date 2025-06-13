const express = require("express");
const router = express.Router();
const {
  bookAppointment,
  getAppointmentsByStudent,
  getAppointmentsByTeacher,
  getAllAppointmentsBetween,
  updateAppointmentStatus,
  deleteAppointment,
  getTeacherById,
  getTeacherByEmail,
  getAllUsersWithAppointments
} = require("../controllers/appointmentController");

router.post("/appointment-book", bookAppointment);
router.get("/student-appointments/:email", getAppointmentsByStudent);
router.get("/teacher-appointments/:email", getAppointmentsByTeacher);
router.get("/appointments/:teacherEmail/:studentEmail", getAllAppointmentsBetween);
router.patch("/appointment/:id", updateAppointmentStatus);
router.delete("/appointment/:id", deleteAppointment);
router.get("/teacher/:id", getTeacherById);
router.get("/teacher-email/:email", getTeacherByEmail);
router.get("/allappointments", getAllUsersWithAppointments);


module.exports = router;
