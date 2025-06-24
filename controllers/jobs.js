const Job = require("../models/Job");
const parseValidationErrs = require("../utils/parseValidationErrs");
const csrf = require("host-csrf");

exports.getAllJobs = async (req, res) => {
  const jobs = await Job.find({ createdBy: req.user._id });
  res.render("jobs", { jobs, _csrf: csrf.token(req, res) });
};

exports.newJobForm = (req, res) => {
  res.render("job", { job: null, _csrf: csrf.token(req, res) });
};

exports.createJob = async (req, res) => {
  try {
    const { company, position, status } = req.body;
    await Job.create({ company, position, status, createdBy: req.user._id });
    res.redirect("/jobs");
  } catch (err) {
    const errors = parseValidationErrs(req, err);
    req.flash("errors", errors);
    res.redirect("/jobs/new");
  }
};

exports.editJobForm = async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
  });
  if (!job) return res.redirect("/jobs");
  res.render("job", { job, _csrf: csrf.token(req, res) });
};

exports.updateJob = async (req, res) => {
  try {
    const { company, position, status } = req.body;
    await Job.updateOne(
      { _id: req.params.id, createdBy: req.user._id },
      { company, position, status }
    );
    res.redirect("/jobs");
  } catch (err) {
    req.flash("errors", ["Could not update job."]);
    res.redirect(`/jobs/edit/${req.params.id}`);
  }
};

exports.deleteJob = async (req, res) => {
  await Job.deleteOne({ _id: req.params.id, createdBy: req.user._id });
  res.redirect("/jobs");
};
