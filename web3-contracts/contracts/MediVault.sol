// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19; // Upgraded to a newer, safer compiler version

contract MediVault {
    
    // STRUCTURES
    struct Report {
        string cID;        // IPFS Hash
        string timeStamp;
        string category;   // e.g., "X-Ray", "Blood Test"
    }

    struct PatientData {
        string patientName;
        string gender;
        uint256 age;       // Changed int to uint (age can't be negative)
        uint256 contactNumber;
        string bloodType;
        string allergies;
        string deficiencies;
        string chronicDiseases;
        string encryptionKey; // UPGRADE: Added to store the user's decryption key securely later
        Report[] reports;
    }

    struct Request {
        address hospital;
        address patient;
        bool granted;
        bool exists;
    }

    // STATE MAPPINGS
    mapping(address => PatientData) public patients; // Renamed 'map' to 'patients' for clarity
    mapping(address => mapping(address => bool)) public permitted;
    mapping(address => bool) public registeredHospitals;
    mapping(address => bool) public registeredPatients;
    mapping(address => Request) public accessRequests;

    // EVENTS (For the frontend to listen to)
    event AccessRequested(address indexed hospital, address indexed patient);
    event AccessGranted(address indexed hospital, address indexed patient);
    event AccessDenied(address indexed hospital, address indexed patient);
    event ReportAdded(address indexed patient, string category, string timestamp);

    // MODIFIERS
    modifier onlyPatient(address patient) {
        require(msg.sender == patient, "Caller is not the patient");
        _;
    }

    modifier onlyAuthorized(address patient) {
        require(
            permitted[patient][msg.sender] || msg.sender == patient,
            "Caller is not authorized"
        );
        _;
    }

    // REGISTRATION FUNCTIONS
    function registerHospital() external {
        require(!registeredHospitals[msg.sender], "Hospital already registered");
        registeredHospitals[msg.sender] = true;
    }

    function registerPatient(string memory _name, uint256 _age, string memory _gender) external {
        require(!registeredPatients[msg.sender], "Patient already registered");
        registeredPatients[msg.sender] = true;
        patients[msg.sender].patientName = _name;
        patients[msg.sender].age = _age;
        patients[msg.sender].gender = _gender;
    }

    // ACCESS CONTROL
    function grantAccess(address hospital) external onlyPatient(msg.sender) {
        require(registeredHospitals[hospital], "Address is not a registered hospital");
        permitted[msg.sender][hospital] = true;
        emit AccessGranted(hospital, msg.sender);
    }

    function revokeAccess(address hospital) external onlyPatient(msg.sender) {
        permitted[msg.sender][hospital] = false;
        // emit AccessRevoked(hospital, msg.sender); // Good to add later
    }

    // REQUEST ACCESS FLOW
    function requestAccess(address patient) external {
        require(registeredHospitals[msg.sender], "Only hospitals can request access");
        require(registeredPatients[patient], "Patient does not exist");
        
        accessRequests[patient] = Request({
            hospital: msg.sender,
            patient: patient,
            granted: false,
            exists: true
        });

        emit AccessRequested(msg.sender, patient);
    }

    function respondToRequest(bool _grant) external {
        Request storage request = accessRequests[msg.sender];
        require(request.exists, "No pending request");
        
        if (_grant) {
            permitted[msg.sender][request.hospital] = true;
            emit AccessGranted(request.hospital, msg.sender);
        } else {
            emit AccessDenied(request.hospital, msg.sender);
        }
        
        delete accessRequests[msg.sender]; // Clear request after handling
    }

    // DATA MANAGEMENT
    function addReport(
        address patient, 
        string memory _cID, 
        string memory _timeStamp, 
        string memory _category
    ) external onlyAuthorized(patient) {
        patients[patient].reports.push(Report(_cID, _timeStamp, _category));
        emit ReportAdded(patient, _category, _timeStamp);
    }

    function updateMedicalInfo(
        string memory _bloodType,
        string memory _allergies,
        string memory _deficiencies,
        string memory _chronicDiseases
    ) external onlyPatient(msg.sender) { // Only patient should edit their own core med info
        patients[msg.sender].bloodType = _bloodType;
        patients[msg.sender].allergies = _allergies;
        patients[msg.sender].deficiencies = _deficiencies;
        patients[msg.sender].chronicDiseases = _chronicDiseases;
    }

    // GETTERS
    function getPatientDetails(address patient) external view onlyAuthorized(patient) returns (
        string memory name, 
        uint256 age, 
        string memory gender, 
        string memory bloodType
    ) {
        PatientData storage p = patients[patient];
        return (p.patientName, p.age, p.gender, p.bloodType);
    }

    function getReports(address patient) external view onlyAuthorized(patient) returns (Report[] memory) {
        return patients[patient].reports;
    }
}