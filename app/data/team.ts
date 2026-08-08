export type TeamRole = {
  slug: string;
  title: string;
  singular: string;
  subtitle: string;
  desc: string;
  members: string[];
};

export const teamRoles: TeamRole[] = [
  {
    slug: "directors",
    title: "Directors",
    singular: "Director",
    subtitle: "Founders · Co-Presidents · Team Leads",
    desc: "The people who started Illuminate and still run it day to day. They set direction, keep projects moving, and make the final call when something's stuck.",
    members: ["Co-President", "Co-President", "Director of Operations", "Director of Content"],
  },
  {
    slug: "officers",
    title: "Officers",
    singular: "Officer",
    subtitle: "Topic experts",
    desc: "Each officer owns one section — testing, academics, extracurriculars — and keeps it accurate as things change.",
    members: [
      "Academics Officer",
      "Testing Officer",
      "Extracurriculars Officer",
      "Lifestyle Officer",
      "College Prep Officer",
    ],
  },
  {
    slug: "associates",
    title: "Associates",
    singular: "Associate",
    subtitle: "Content contributors",
    desc: "Students who write guides, do the research, and design the pages. Most people here started as an associate.",
    members: ["Content Associate", "Research Associate", "Design Associate", "Outreach Associate"],
  },
  {
    slug: "members",
    title: "Members",
    singular: "Member",
    subtitle: "Community",
    desc: "Anyone using the guides, coming to a workshop, or telling a friend about us. Everyone starts here.",
    members: ["General member", "Workshop attendee", "Community contributor"],
  },
];
