import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Church, BookOpen, Heart, Users, Shield, Star, ChevronRight, Cross, Flame } from "lucide-react";

const FUNDAMENTAL_TRUTHS = [
  { title: "The Scriptures Inspired", summary: "The Bible is the inspired Word of God, infallible and authoritative." },
  { title: "The One True God", summary: "One God eternally existing in three persons: Father, Son, and Holy Spirit." },
  { title: "The Deity of the Lord Jesus Christ", summary: "Jesus is fully God and fully man, born of a virgin." },
  { title: "The Fall of Man", summary: "Humanity fell through sin and needs redemption." },
  { title: "The Salvation of Man", summary: "Salvation is received through repentance and faith in Christ." },
  { title: "The Ordinances of the Church", summary: "Water baptism by immersion and the Lord's Supper." },
  { title: "The Baptism in the Holy Spirit", summary: "A subsequent experience with the initial evidence of speaking in tongues." },
  { title: "The Initial Physical Evidence", summary: "Speaking in tongues as the Spirit gives utterance." },
  { title: "Sanctification", summary: "The progressive work of grace making us holy." },
  { title: "The Church and Its Mission", summary: "The Church is the body of Christ called to worship and evangelize." },
  { title: "The Ministry", summary: "God-called leadership for equipping the saints." },
  { title: "Divine Healing", summary: "Healing is provided for in the atonement." },
  { title: "The Blessed Hope", summary: "The rapture of the Church at Christ's return." },
  { title: "The Millennial Reign of Christ", summary: "Christ will reign on earth for a thousand years." },
  { title: "The Final Judgment", summary: "The wicked will be judged and eternally separated from God." },
  { title: "The New Heavens and New Earth", summary: "God will create new heavens and a new earth." },
];

const DISCIPLESHIP_STEPS = [
  { 
    step: "WORSHIP", 
    icon: Church, 
    color: "text-purple-500",
    description: "Gathering together on Sundays for worship, prayer, and teaching.",
    activities: ["Sunday Services", "Prayer Nights", "Special Gatherings"]
  },
  { 
    step: "NEXT", 
    icon: Star, 
    color: "text-amber-500",
    description: "Attending NEXT NIGHT to learn about Garden City Church and meet leaders.",
    activities: ["Church Tour", "Meet Leadership", "Get Connected"]
  },
  { 
    step: "LEARN", 
    icon: BookOpen, 
    color: "text-blue-500",
    description: "Growing through classes like Following Jesus, Essentials, and Discipleship Hour.",
    activities: ["Following Jesus Course", "Truth-Trek", "Discipleship Hour"]
  },
  { 
    step: "LOVE", 
    icon: Heart, 
    color: "text-red-500",
    description: "Building community through CORE Groups, caring for one another.",
    activities: ["CORE Groups", "Community Events", "Care Ministry"]
  },
  { 
    step: "LEAD", 
    icon: Shield, 
    color: "text-green-500",
    description: "Serving on ministry teams and developing as leaders.",
    activities: ["Ministry Teams", "Leadership Development", "Mentorship"]
  },
];

export default function AboutUs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">About Us</h1>
        <p className="text-muted-foreground">Learn about who we are, what we believe, and how we grow together</p>
      </div>

      <Accordion type="multiple" defaultValue={["who-we-are", "discipleship"]} className="space-y-4">
        <AccordionItem value="who-we-are" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-who-we-are">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Church className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Who We Are</h3>
                <p className="text-sm text-muted-foreground font-normal">Our vision, mission, and distinctives</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-6">
              <p className="text-muted-foreground">
                We are a church rooted and guided by the Bible, with a Pentecostal/Charismatic expression. 
                We are affiliated with the Assemblies of God.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Our Mission</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-medium text-primary">
                      "To know Christ and make Him known in our city and in every nation."
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Our Vision</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-medium text-primary">
                      "Live the Life. Tell the Story."
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Our Distinctives</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <BookOpen className="w-4 h-4 mt-1 text-primary" />
                    <span className="text-sm">Bible-driven foundation</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <Users className="w-4 h-4 mt-1 text-primary" />
                    <span className="text-sm">Active Church Participants (ACPs) instead of formal membership</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <Shield className="w-4 h-4 mt-1 text-primary" />
                    <span className="text-sm">Pastor-led with Board oversight</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <Flame className="w-4 h-4 mt-1 text-primary" />
                    <span className="text-sm">Balancing gifts of the Spirit with order</span>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="beliefs" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-beliefs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Cross className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Our Beliefs (Majors & Minors)</h3>
                <p className="text-sm text-muted-foreground font-normal">Core doctrines we hold firmly</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge>Majors</Badge>
                  <span className="text-sm font-normal text-muted-foreground">Things we hold firmly</span>
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    "Scripture is trustworthy",
                    "One God, three persons",
                    "Jesus our Savior and King",
                    "Salvation by grace through faith",
                    "Spirit empowerment",
                    "Prayer"
                  ].map(belief => (
                    <div key={belief} className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm">{belief}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="secondary">Minors</Badge>
                  <span className="text-sm font-normal text-muted-foreground">Areas where believers may differ</span>
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    "Eschatology positions",
                    "Eternal security debates",
                    "Calvinism vs Arminianism",
                    "Five-fold ministry structure",
                    "Attitude toward other denominations"
                  ].map(belief => (
                    <div key={belief} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                      <span className="text-sm">{belief}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fundamental-truths" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-fundamental-truths">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">16 Fundamental Truths</h3>
                <p className="text-sm text-muted-foreground font-normal">Assemblies of God statement of faith</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              <div className="grid gap-3">
                {FUNDAMENTAL_TRUTHS.map((truth, index) => (
                  <div key={index} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <h5 className="font-medium text-sm">{truth.title}</h5>
                        <p className="text-sm text-muted-foreground">{truth.summary}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                For the full Assemblies of God Statement of Fundamental Truths, visit the AG website.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="baptism-communion" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-baptism-communion">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Heart className="w-5 h-5 text-cyan-500" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Baptism & Communion</h3>
                <p className="text-sm text-muted-foreground font-normal">Our practice of the ordinances</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Water Baptism</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>An outward sign of an inward reality of faith in Christ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>Follows the pattern: Repentance → Baptism → Life of Discipleship</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>Performed by full immersion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>Re-baptism is appropriate when someone comes to genuine faith after a prior baptism</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Communion (Lord's Supper)</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>Symbolic remembrance of Christ's death, resurrection, and return</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>A time for self-examination and gratitude</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>Celebrated during Family Sundays</span>
                  </li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="discipleship" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-discipleship">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Star className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Discipleship Process</h3>
                <p className="text-sm text-muted-foreground font-normal">Worship → NEXT → Learn → Love → Lead</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Our discipleship pathway guides you from your first visit to becoming a leader who makes disciples.
              </p>
              
              <div className="space-y-4">
                {DISCIPLESHIP_STEPS.map((step, index) => (
                  <Card key={step.step}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg bg-muted/50 ${step.color}`}>
                          <step.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground">STEP {index + 1}</span>
                            <h4 className="font-semibold">{step.step}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {step.activities.map(activity => (
                              <Badge key={activity} variant="outline" className="text-xs">
                                {activity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-center pt-4">
                <Link href="/discipleship">
                  <Button data-testid="button-view-my-path">
                    View My Discipleship Path
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="leadership" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-leadership">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Leadership & Governance</h3>
                <p className="text-sm text-muted-foreground font-normal">How our church is structured</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Lead Pastor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Provides spiritual oversight and vision for the church.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Board of Elders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Provides accountability and governance oversight.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Leadership Team</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Staff and key volunteers who oversee ministry areas.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Active Church Participants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Committed members who serve, give, and participate in church life.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
