export const state = {
  patients: [],
  appointments: [],
  nextId: 1,
  nextAptId: 1
};

export const resetState = () => {
  state.patients = [];
  state.appointments = [];
  state.nextId = 1;
  state.nextAptId = 1;
};
