import { PropertyPurpose } from '../../../common/enums/property-purpose.enum.js';
import { PropertyStatus } from '../../../common/enums/property-status.enum.js';
import { RequirementPurpose } from '../../../common/enums/requirement-purpose.enum.js';
import { RequirementStatus } from '../../../common/enums/requirement-status.enum.js';
import type { IDemoDataset } from '../interfaces/i-demo-dataset.js';

const { SALE, RENT } = PropertyPurpose;
const { AVAILABLE, SOLD, RENTED } = PropertyStatus;
const { BUY, RENT: RENT_WANTED } = RequirementPurpose;
const { OPEN, MATCHED, CLOSED } = RequirementStatus;

// Three months of one dealership, written so every screen and status has real rows
export const DEMO_DATASET: IDemoDataset = {
  companyName: 'Demo Estate & Builders',
  companyPhone: '03001112233',
  companyCity: 'Lahore',
  companyAddress: '45-B Main Boulevard, Gulberg III',
  createdDaysAgo: 92,

  propertyTypes: [
    { name: 'Penthouse', createdDaysAgo: 88 },
    { name: 'Farmhouse', createdDaysAgo: 60 },
    { name: 'Basement', createdDaysAgo: 55, deactivatedDaysAgo: 20 },
  ],

  facilities: [
    { name: 'Servant quarter', createdDaysAgo: 82, deactivatedDaysAgo: 12 },
    { name: 'Lift', createdDaysAgo: 70 },
    { name: 'Solar panels', createdDaysAgo: 60 },
  ],

  contacts: [
    { key: 'aslam', name: 'Muhammad Aslam', phone: '03001234501', cnic: '35202-1234567-1', address: 'Gulberg III, Lahore', notes: 'Owns several shops on Liberty and in Johar Town.', createdDaysAgo: 90 },
    { key: 'farah', name: 'Farah Naz', phone: '03211234502', email: 'farah.naz@example.com', notes: 'Rents out rooms near universities.', createdDaysAgo: 86 },
    { key: 'usman', name: 'Usman Ghani', phone: '03211234507', cnic: '35201-7654321-3', notes: 'Overseas owner, prefers WhatsApp.', createdDaysAgo: 82 },
    { key: 'imran', name: 'Imran Qureshi', phone: '03331234503', address: 'Model Town, Lahore', createdDaysAgo: 80 },
    { key: 'saima', name: 'Saima Akhtar', phone: '03451234504', email: 'saima.akhtar@example.com', notes: 'Both an owner and looking for an office.', createdDaysAgo: 75 },
    { key: 'bilal', name: 'Bilal Ahmed', phone: '03011234505', createdDaysAgo: 70 },
    { key: 'kamran', name: 'Kamran Butt', phone: '03001234509', cnic: '42101-1122334-5', notes: 'Commercial owner in Lahore, Karachi and Islamabad.', createdDaysAgo: 70 },
    { key: 'hina', name: 'Hina Tariq', phone: '03121234506', email: 'hina.tariq@example.com', createdDaysAgo: 64 },
    { key: 'tahir', name: 'Tahir Iqbal', phone: '03041234515', notes: 'Stopped responding; kept for history.', createdDaysAgo: 60, deactivatedDaysAgo: 35 },
    { key: 'ayesha', name: 'Ayesha Siddiqui', phone: '03341234508', createdDaysAgo: 50 },
    { key: 'zainab', name: 'Zainab Raza', phone: '03451234510', notes: 'Student, needs a room close to campus.', createdDaysAgo: 37 },
    { key: 'faisal', name: 'Faisal Mehmood', phone: '03061234511', email: 'faisal.m@example.com', createdDaysAgo: 29 },
    { key: 'nadia', name: 'Nadia Hussain', phone: '03151234512', address: 'Gulberg Greens, Islamabad', createdDaysAgo: 21 },
    { key: 'ali', name: 'Ali Hassan', phone: '03231234513', createdDaysAgo: 14 },
    { key: 'rabia', name: 'Rabia Khalid', phone: '03361234514', createdDaysAgo: 6 },
    { key: 'sana', name: 'Sana Javed', phone: '03171234516', createdDaysAgo: 2 },
  ],

  // Every city and area the listings below use, plus a dropped area and a dropped city
  cities: [
    {
      name: 'Lahore',
      createdDaysAgo: 91,
      areas: [
        { name: 'Gulberg III', createdDaysAgo: 91 },
        { name: 'Johar Town', createdDaysAgo: 91 },
        { name: 'Model Town', createdDaysAgo: 90 },
        { name: 'Cantt', createdDaysAgo: 90 },
        { name: 'DHA Phase 5', createdDaysAgo: 88 },
        { name: 'Bahria Town', createdDaysAgo: 85 },
        { name: 'Wapda Town', createdDaysAgo: 80 },
        { name: 'Ferozepur Road', createdDaysAgo: 75 },
        { name: 'Shadman', createdDaysAgo: 70, deactivatedDaysAgo: 30 },
        { name: 'Bedian Road', createdDaysAgo: 60 },
        { name: 'Anarkali', createdDaysAgo: 40 },
      ],
    },
    {
      name: 'Islamabad',
      createdDaysAgo: 75,
      areas: [
        { name: 'Blue Area', createdDaysAgo: 72 },
        { name: 'Gulberg Greens', createdDaysAgo: 50 },
        { name: 'F-7 Markaz', createdDaysAgo: 45 },
      ],
    },
    {
      name: 'Karachi',
      createdDaysAgo: 70,
      areas: [
        { name: 'Clifton', createdDaysAgo: 68 },
        { name: 'DHA Phase 8', createdDaysAgo: 50 },
        { name: 'Bahadurabad', createdDaysAgo: 30 },
      ],
    },
    {
      name: 'Multan',
      createdDaysAgo: 65,
      deactivatedDaysAgo: 20,
      areas: [
        { name: 'Cantt', createdDaysAgo: 65, deactivatedDaysAgo: 25 },
        { name: 'Bosan Road', createdDaysAgo: 60, deactivatedDaysAgo: 22 },
      ],
    },
  ],

  properties: [
    { title: 'Corner shop, Liberty Market', typeName: 'Shop', ownerKey: 'aslam', purpose: RENT, price: 85_000, securityDeposit: 255_000, areaSqft: 220, facilityNames: ['1 bathroom', 'Electricity backup'], floor: 'Ground', city: 'Lahore', areaName: 'Gulberg III', propertyStatus: RENTED, createdDaysAgo: 88, updatedDaysAgo: 66 },
    { title: 'Room with attached bath near UCP', typeName: 'Room', ownerKey: 'farah', purpose: RENT, price: 18_000, securityDeposit: 36_000, areaSqft: 180, facilityNames: ['1 bedroom', '1 bathroom', 'Attached bath', 'Gas'], floor: '1st', city: 'Lahore', areaName: 'Johar Town', propertyStatus: AVAILABLE, createdDaysAgo: 84 },
    { title: 'Upper portion, 1 bed attached bath', typeName: 'Portion', ownerKey: 'imran', purpose: RENT, price: 32_000, securityDeposit: 64_000, areaSqft: 650, facilityNames: ['1 bedroom', '1 bathroom', 'Attached bath', 'Separate entrance', 'Gas'], floor: '1st', city: 'Lahore', areaName: 'Model Town', propertyStatus: RENTED, createdDaysAgo: 79, updatedDaysAgo: 40 },
    { title: 'Old listing: 1 kanal house, Cantt', typeName: 'House', ownerKey: 'usman', purpose: SALE, price: 55_000_000, areaSqft: 4_500, facilityNames: ['4+ bedrooms', '3+ bathrooms', 'Attached bath', 'Parking', 'Gas', 'Servant quarter'], city: 'Lahore', areaName: 'Cantt', description: 'Owner withdrew the listing.', propertyStatus: AVAILABLE, createdDaysAgo: 80, updatedDaysAgo: 30, isDeactivated: true },
    { title: '5 marla house, DHA Phase 5', typeName: 'House', ownerKey: 'saima', purpose: SALE, price: 23_500_000, areaSqft: 1_125, facilityNames: ['3 bedrooms', '3+ bathrooms', 'Attached bath', 'Parking', 'Gas'], city: 'Lahore', areaName: 'DHA Phase 5', propertyStatus: SOLD, createdDaysAgo: 74, updatedDaysAgo: 25 },
    { title: '10 marla plot, Bahria Town', typeName: 'Plot', ownerKey: 'usman', purpose: SALE, price: 9_500_000, areaSqft: 2_250, city: 'Lahore', areaName: 'Bahria Town', propertyStatus: AVAILABLE, createdDaysAgo: 72 },
    { title: 'Office floor, Blue Area', typeName: 'Office', ownerKey: 'kamran', purpose: RENT, price: 150_000, securityDeposit: 450_000, areaSqft: 1_800, facilityNames: ['2 bathrooms', 'Parking', 'Electricity backup', 'Lift'], floor: '4th', city: 'Islamabad', areaName: 'Blue Area', propertyStatus: RENTED, createdDaysAgo: 68, updatedDaysAgo: 15 },
    { title: '2 bed flat, Clifton Block 5', typeName: 'Flat', ownerKey: 'usman', purpose: RENT, price: 65_000, securityDeposit: 130_000, areaSqft: 1_100, facilityNames: ['2 bedrooms', '2 bathrooms', 'Attached bath', 'Furnished', 'Parking', 'Lift', 'Electricity backup'], floor: '6th', city: 'Karachi', areaName: 'Clifton', propertyStatus: AVAILABLE, createdDaysAgo: 66 },
    { title: 'Ground floor shop, Johar Town', typeName: 'Shop', ownerKey: 'aslam', purpose: SALE, price: 18_000_000, areaSqft: 300, facilityNames: ['Electricity backup'], floor: 'Ground', city: 'Lahore', areaName: 'Johar Town', propertyStatus: AVAILABLE, createdDaysAgo: 62 },
    { title: 'Lower portion, 2 bed', typeName: 'Portion', ownerKey: 'imran', purpose: RENT, price: 45_000, securityDeposit: 90_000, areaSqft: 1_125, facilityNames: ['2 bedrooms', '2 bathrooms', 'Attached bath', 'Separate entrance', 'Gas'], floor: 'Ground', city: 'Lahore', areaName: 'Wapda Town', propertyStatus: AVAILABLE, createdDaysAgo: 57 },
    { title: 'Warehouse on Ferozepur Road', typeName: 'Warehouse', ownerKey: 'kamran', purpose: RENT, price: 120_000, securityDeposit: 360_000, areaSqft: 5_000, facilityNames: ['1 bathroom', 'Parking'], city: 'Lahore', areaName: 'Ferozepur Road', propertyStatus: RENTED, createdDaysAgo: 52, updatedDaysAgo: 18 },
    { title: 'Furnished studio room, Gulberg', typeName: 'Room', ownerKey: 'farah', purpose: RENT, price: 22_000, securityDeposit: 22_000, areaSqft: 220, facilityNames: ['1 bedroom', '1 bathroom', 'Attached bath', 'Furnished'], city: 'Lahore', areaName: 'Gulberg III', propertyStatus: AVAILABLE, createdDaysAgo: 47 },
    { title: 'Penthouse with sea-facing terrace', typeName: 'Penthouse', ownerKey: 'kamran', purpose: SALE, price: 65_000_000, areaSqft: 3_200, facilityNames: ['4+ bedrooms', '3+ bathrooms', 'Attached bath', 'Furnished', 'Parking', 'Lift', 'Electricity backup', 'Solar panels'], floor: '18th', city: 'Karachi', areaName: 'DHA Phase 8', propertyStatus: AVAILABLE, createdDaysAgo: 45 },
    { title: 'Shared room, common bath', typeName: 'Room', purpose: RENT, price: 9_000, areaSqft: 150, facilityNames: ['1 bedroom'], city: 'Lahore', areaName: 'Johar Town', description: 'Walk-in listing, owner details not recorded.', propertyStatus: AVAILABLE, createdDaysAgo: 41 },
    { title: 'Farmhouse on Bedian Road', typeName: 'Farmhouse', ownerKey: 'saima', purpose: RENT, price: 400_000, securityDeposit: 800_000, areaSqft: 20_000, facilityNames: ['4+ bedrooms', '3+ bathrooms', 'Attached bath', 'Furnished', 'Parking', 'Solar panels', 'Servant quarter'], city: 'Lahore', areaName: 'Bedian Road', propertyStatus: AVAILABLE, createdDaysAgo: 38 },
    { title: 'Basement storage, Gulberg', typeName: 'Basement', ownerKey: 'aslam', purpose: RENT, price: 25_000, securityDeposit: 50_000, areaSqft: 900, city: 'Lahore', areaName: 'Gulberg III', propertyStatus: AVAILABLE, createdDaysAgo: 33 },
    { title: '3 bed flat, Gulberg Greens', typeName: 'Flat', ownerKey: 'nadia', purpose: SALE, price: 28_000_000, areaSqft: 1_600, facilityNames: ['3 bedrooms', '3+ bathrooms', 'Attached bath', 'Semi-furnished', 'Parking', 'Lift'], floor: '2nd', city: 'Islamabad', areaName: 'Gulberg Greens', propertyStatus: AVAILABLE, createdDaysAgo: 19 },
    { title: 'Small shop near Anarkali', typeName: 'Shop', ownerKey: 'nadia', purpose: RENT, price: 40_000, securityDeposit: 120_000, areaSqft: 120, floor: 'Ground', city: 'Lahore', areaName: 'Anarkali', propertyStatus: AVAILABLE, createdDaysAgo: 18 },
    { title: 'Office suite, MM Alam Road', typeName: 'Office', ownerKey: 'nadia', purpose: RENT, price: 95_000, securityDeposit: 285_000, areaSqft: 900, facilityNames: ['1 bathroom', 'Electricity backup', 'Lift'], floor: '3rd', city: 'Lahore', areaName: 'Gulberg III', propertyStatus: AVAILABLE, createdDaysAgo: 10 },
    { title: '8 marla house, Wapda Town', typeName: 'House', ownerKey: 'aslam', purpose: RENT, price: 90_000, securityDeposit: 180_000, areaSqft: 1_800, facilityNames: ['4+ bedrooms', '3+ bathrooms', 'Attached bath', 'Parking', 'Gas', 'Solar panels'], city: 'Lahore', areaName: 'Wapda Town', propertyStatus: AVAILABLE, createdDaysAgo: 8 },
    { title: 'Room for working women, attached bath', typeName: 'Room', ownerKey: 'imran', purpose: RENT, price: 15_000, securityDeposit: 15_000, areaSqft: 160, facilityNames: ['1 bedroom', '1 bathroom', 'Attached bath', 'Furnished', 'Gas'], city: 'Lahore', areaName: 'Model Town', propertyStatus: AVAILABLE, createdDaysAgo: 5 },
    { title: 'Upper portion 1 bed, Johar Town', typeName: 'Portion', ownerKey: 'farah', purpose: RENT, price: 28_000, securityDeposit: 56_000, areaSqft: 550, facilityNames: ['1 bedroom', '1 bathroom', 'Attached bath', 'Separate entrance'], floor: '1st', city: 'Lahore', areaName: 'Johar Town', propertyStatus: AVAILABLE, createdDaysAgo: 3 },
  ],

  requirements: [
    { contactKey: 'bilal', purpose: RENT_WANTED, typeName: 'Shop', budgetMax: 100_000, preferredCity: 'Lahore', preferredAreaNames: ['Gulberg III'], notes: 'Took the Liberty Market corner shop.', requirementStatus: CLOSED, matchedPropertyTitle: 'Corner shop, Liberty Market', createdDaysAgo: 69, updatedDaysAgo: 66 },
    { contactKey: 'hina', purpose: RENT_WANTED, typeName: 'Portion', budgetMax: 35_000, facilityNames: ['1 bedroom', 'Attached bath', 'Separate entrance'], preferredCity: 'Lahore', notes: 'Model Town portion agreed, awaiting agreement signing.', requirementStatus: MATCHED, matchedPropertyTitle: 'Upper portion, 1 bed attached bath', createdDaysAgo: 63, updatedDaysAgo: 41 },
    { contactKey: 'tahir', purpose: BUY, typeName: 'House', budgetMin: 30_000_000, budgetMax: 40_000_000, preferredCity: 'Lahore', notes: 'Client went silent.', requirementStatus: CLOSED, createdDaysAgo: 58, updatedDaysAgo: 35, isDeactivated: true },
    { contactKey: 'ayesha', purpose: BUY, typeName: 'House', budgetMin: 20_000_000, budgetMax: 25_000_000, facilityNames: ['3 bedrooms', 'Parking'], preferredCity: 'Lahore', preferredAreaNames: ['DHA Phase 5'], notes: 'Bought the DHA Phase 5 house.', requirementStatus: CLOSED, matchedPropertyTitle: '5 marla house, DHA Phase 5', createdDaysAgo: 49, updatedDaysAgo: 25 },
    { contactKey: 'ayesha', purpose: RENT_WANTED, typeName: 'Warehouse', budgetMax: 150_000, preferredCity: 'Lahore', notes: 'Rented the Ferozepur Road warehouse for her business.', requirementStatus: CLOSED, matchedPropertyTitle: 'Warehouse on Ferozepur Road', createdDaysAgo: 48, updatedDaysAgo: 18 },
    { contactKey: 'zainab', purpose: RENT_WANTED, typeName: 'Room', budgetMax: 20_000, facilityNames: ['1 bedroom', 'Attached bath'], preferredCity: 'Lahore', notes: 'Needs attached bath, close to campus.', requirementStatus: OPEN, createdDaysAgo: 36 },
    { contactKey: 'saima', purpose: RENT_WANTED, typeName: 'Office', facilityNames: ['Parking', 'Electricity backup'], budgetMin: 100_000, budgetMax: 200_000, preferredCity: 'Islamabad', notes: 'Signed for the Blue Area office floor.', requirementStatus: MATCHED, matchedPropertyTitle: 'Office floor, Blue Area', createdDaysAgo: 30, updatedDaysAgo: 15 },
    { contactKey: 'faisal', purpose: BUY, typeName: 'Shop', facilityNames: ['Electricity backup'], budgetMin: 15_000_000, budgetMax: 20_000_000, preferredCity: 'Lahore', preferredAreaNames: ['Johar Town'], requirementStatus: OPEN, createdDaysAgo: 28 },
    { contactKey: 'hina', purpose: BUY, typeName: 'Penthouse', facilityNames: ['Parking', 'Lift'], budgetMin: 50_000_000, preferredCity: 'Karachi', requirementStatus: OPEN, createdDaysAgo: 22 },
    { contactKey: 'ali', purpose: RENT_WANTED, budgetMax: 100_000, preferredCity: 'Lahore', preferredAreaNames: ['Gulberg III', 'Anarkali'], notes: 'Any type: shop, office or storage for a small business.', requirementStatus: OPEN, createdDaysAgo: 13 },
    { contactKey: 'rabia', purpose: RENT_WANTED, typeName: 'Flat', budgetMax: 70_000, facilityNames: ['2 bedrooms', 'Attached bath', 'Parking'], preferredCity: 'Karachi', requirementStatus: OPEN, createdDaysAgo: 5 },
    { contactKey: 'sana', purpose: BUY, typeName: 'Plot', budgetMax: 8_000_000, preferredCity: 'Lahore', notes: 'Nothing in budget yet; check again when new plots come in.', requirementStatus: OPEN, createdDaysAgo: 1 },
  ],
};
